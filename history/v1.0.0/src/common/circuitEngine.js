/**
 * 电路求解引擎 —— 改进节点法（MNA, Modified Nodal Analysis）
 *
 * 网格模型：节点按 COLS x ROWS 排布，元件放在相邻两节点之间的「格边」上。
 *   水平边 (r, c)   -> 节点 (r, c) 与 (r, c+1)
 *   垂直边 (r, c)   -> 节点 (r, c) 与 (r+1, c)
 *
 * 元件类型（kind）：
 *   wire      导线       —— 理想导体，按 0V 电压源处理
 *   switch    开关       —— 闭合=0V 电压源；断开=断路（不参与求解）
 *   ammeter   电流表     —— 理想，0V 电压源，读取所在支路电流
 *   voltmeter 电压表     —— 理想，∞Ω（断路），读取两端电压
 *   battery   电源       —— 理想电压源 value，内部电阻 rin
 *   resistor  电阻       —— value
 *   lamp      小灯泡     —— value（灯丝电阻）
 *   rheostat  滑动变阻器 —— value（当前接入阻值）
 *   motor     电动机     —— value（线圈电阻）
 *   fan       风扇电机   —— value（线圈电阻）
 *   heater    电热器     —— value
 *
 * 每个元件：{ kind, a, b, value, rin, closed, tag }
 *   a / b 为节点编号（0 起）；对电池，a 为正极节点。
 */

export var COLS = 4
export var ROWS = 4
export var NODE_COUNT = COLS * ROWS

// 极小阻值：把理想导体当作极小电阻处理时的等效值
var EPS_R = 1e-6
// 节点对地漏电导，仅用于让矩阵在浮空子网时保持非奇异
var LEAK_G = 1e-9

export function nodeId(r, c) {
  return r * COLS + c
}

export function edgeKey(dir, r, c) {
  return dir + '-' + r + '-' + c
}

/** 根据格边生成元件骨架 */
export function makeElement(dir, r, c) {
  var a
  var b
  if (dir === 'h') {
    a = nodeId(r, c)
    b = nodeId(r, c + 1)
  } else {
    a = nodeId(r, c)
    b = nodeId(r + 1, c)
  }
  return { kind: 'wire', a: a, b: b, value: 10, rin: 0, closed: true, dir: dir, r: r, c: c }
}

/** 库中所有可选元件的元信息（供 UI 生成选择面板与默认值） */
export var KINDS = [
  { kind: 'wire', name: '导线', unit: '', def: 0, symbol: '—' },
  { kind: 'resistor', name: '定值电阻', unit: 'Ω', def: 10, symbol: 'R' },
  { kind: 'lamp', name: '小灯泡', unit: 'Ω', def: 10, symbol: 'L' },
  { kind: 'battery', name: '电源', unit: 'V', def: 3, symbol: 'E' },
  { kind: 'switch', name: '开关', unit: '', def: 0, symbol: 'S' },
  { kind: 'ammeter', name: '电流表', unit: '', def: 0, symbol: 'A' },
  { kind: 'voltmeter', name: '电压表', unit: '', def: 0, symbol: 'V' },
  { kind: 'rheostat', name: '滑动变阻器', unit: 'Ω', def: 20, symbol: 'Rp' },
  { kind: 'motor', name: '电动机', unit: 'Ω', def: 10, symbol: 'M' },
  { kind: 'heater', name: '电热器', unit: 'Ω', def: 20, symbol: 'H' }
]

export function kindInfo(kind) {
  for (var i = 0; i < KINDS.length; i++) {
    if (KINDS[i].kind === kind) return KINDS[i]
  }
  return KINDS[0]
}

/** 灯泡：由额定功率与额定电压求灯丝电阻 R = U额² / P额 */
export function lampResistance(pu, uu) {
  if (!pu || !uu) return 0
  return (uu * uu) / pu
}

/** 滑动变阻器：按百分比求接入阻值 */
export function rheostatResistance(maxR, percent) {
  var p = percent
  if (p < 0) p = 0
  if (p > 100) p = 100
  return (maxR * p) / 100
}

// ---------------------------------------------------------------------------
// 线性方程组求解：高斯消元 + 部分主元
// ---------------------------------------------------------------------------

function solveLinear(A, b, n) {
  var i
  var j
  var k
  var big
  var row
  var tmp
  var res = new Array(n)

  for (i = 0; i < n; i++) {
    big = Math.abs(A[i][i])
    row = i
    for (k = i + 1; k < n; k++) {
      var v = Math.abs(A[k][i])
      if (v > big) { big = v; row = k }
    }
    if (big < 1e-14) {
      return null // 奇异：电路无解（理想电源直接短路等）
    }
    if (row !== i) {
      var t = A[i]; A[i] = A[row]; A[row] = t
      var tb = b[i]; b[i] = b[row]; b[row] = tb
    }
    for (k = i + 1; k < n; k++) {
      var f = A[k][i] / A[i][i]
      if (f === 0) continue
      for (j = i; j < n; j++) A[k][j] -= f * A[i][j]
      b[k] -= f * b[i]
    }
  }
  for (i = n - 1; i >= 0; i--) {
    var s = b[i]
    for (j = i + 1; j < n; j++) s -= A[i][j] * res[j]
    res[i] = s / A[i][i]
  }
  return res
}

// ---------------------------------------------------------------------------
// 主求解函数
// ---------------------------------------------------------------------------

/**
 * @param {Array} elements 元件数组
 * @param {Object} opts { ground: 节点编号, label }
 * @returns {Object} { ok, v: 节点电压数组, I: 支路电流数组, per: 每个元件结果,
 *                      total: {U,I,R,P}, state: 'ok'|'open'|'short'|'error', message }
 */
export function solve(elements, opts) {
  opts = opts || {}
  var N = NODE_COUNT
  var el = elements || []
  var i
  var j

  // ---- 1. 分类：电压源支路 / 电阻支路 / 断开支路 ----
  var vsrc = [] // { el, E, 记录电流 }
  var rbrc = [] // { el, R }
  var openCount = 0

  for (i = 0; i < el.length; i++) {
    var e = el[i]
    var kind = e.kind
    if (kind === 'wire') {
      vsrc.push({ el: e, E: 0 })
    } else if (kind === 'ammeter') {
      vsrc.push({ el: e, E: 0 })
    } else if (kind === 'switch') {
      if (e.closed === false) openCount++
      else vsrc.push({ el: e, E: 0 })
    } else if (kind === 'battery') {
      var rin = e.rin || 0
      if (rin > 0) {
        rbrc.push({ el: e, R: rin })
        vsrc.push({ el: e, E: e.value || 0, hasR: true })
      } else {
        vsrc.push({ el: e, E: e.value || 0 })
      }
    } else if (kind === 'voltmeter') {
      openCount++ // 电压表内阻极大，等效断路
    } else if (kind === 'resistor' || kind === 'lamp' || kind === 'rheostat' ||
               kind === 'motor' || kind === 'heater') {
      var R = e.value
      if (!R || R < 0) R = 0
      if (R === 0) {
        vsrc.push({ el: e, E: 0 })
      } else {
        rbrc.push({ el: e, R: R })
      }
    }
  }

  // ---- 2. 选参考地 ----
  var ground = opts.ground
  if (ground === undefined || ground === null) {
    ground = -1
    for (i = 0; i < vsrc.length; i++) {
      if (vsrc[i].el.kind === 'battery') { ground = vsrc[i].el.a; break }
    }
    if (ground < 0) {
      // 无电源时取被连接最多的一端
      var deg = new Array(N)
      for (i = 0; i < N; i++) deg[i] = 0
      for (i = 0; i < el.length; i++) { deg[el[i].a]++; deg[el[i].b]++ }
      var best = 0
      for (i = 1; i < N; i++) if (deg[i] > deg[best]) best = i
      ground = best
    }
  }

  // ---- 3. 组装 MNA 矩阵 ----
  // 未知量：节点电压 v[0..N-1]（ground 行省略）+ 电压源电流 i[0..M-1]
  var M = vsrc.length
  var size = (N - 1) + M
  var A = new Array(size)
  var b = new Array(size)
  for (i = 0; i < size; i++) { A[i] = new Array(size); b[i] = 0 }
  for (i = 0; i < size; i++) for (j = 0; j < size; j++) A[i][j] = 0

  // 节点电压列索引：参考地不出现在未知量中
  var idx = new Array(N)
  var k2 = 0
  for (i = 0; i < N; i++) {
    if (i === ground) { idx[i] = -1 } else { idx[i] = k2; k2++ }
  }
  function col(node) { return idx[node] }
  // 电压源电流列索引
  function vcol(k) { return (N - 1) + k }

  // 3.1 电阻支路
  for (i = 0; i < rbrc.length; i++) {
    var br = rbrc[i]
    var G = 1 / br.R
    var ca = col(br.el.a)
    var cb = col(br.el.b)
    if (ca >= 0) A[ca][ca] += G
    if (cb >= 0) A[cb][cb] += G
    if (ca >= 0 && cb >= 0) { A[ca][cb] -= G; A[cb][ca] -= G }
  }
  // 3.2 电压源支路
  for (i = 0; i < M; i++) {
    var s = vsrc[i]
    var ca2 = col(s.el.a)
    var cb2 = col(s.el.b)
    var vc = vcol(i)
    if (ca2 >= 0) { A[ca2][vc] += 1; A[vc][ca2] += 1 }
    if (cb2 >= 0) { A[cb2][vc] -= 1; A[vc][cb2] -= 1 }
    b[vc] = s.E
  }
  // 3.3 对地漏电，保证浮空子网可解
  for (i = 0; i < N - 1; i++) A[i][i] += LEAK_G

  // ---- 4. 求解 ----
  var x = solveLinear(A, b, size)
  if (!x) {
    return {
      ok: false, state: 'error', v: null, I: null, per: [], ground: ground,
      message: '电路无解：理想电源被导线直接短路（给电源加上内阻再试）'
    }
  }

  var v = new Array(N)
  for (i = 0; i < N; i++) {
    v[i] = (i === ground) ? 0 : x[idx[i]]
  }
  var I = new Array(M)
  for (i = 0; i < M; i++) I[i] = x[vcol(i)]

  // ---- 5. 逐元件结果 ----
  var per = []
  var srcIndex = 0
  var rIndex = 0
  for (i = 0; i < el.length; i++) {
    var e2 = el[i]
    var rec = { kind: e2.kind, a: e2.a, b: e2.b, dir: e2.dir, r: e2.r, c: e2.c }
    if (e2.kind === 'voltmeter') {
      rec.U = v[e2.a] - v[e2.b]
      rec.I = 0
      rec.P = 0
      rec.live = true
    } else if (e2.kind === 'switch' && e2.closed === false) {
      rec.U = v[e2.a] - v[e2.b]
      rec.I = 0
      rec.P = 0
      rec.live = false
    } else if (e2.kind === 'wire') {
      rec.U = v[e2.a] - v[e2.b]
      rec.I = I[srcIndex++]
      rec.P = rec.U * rec.I
      rec.live = true
    } else if (e2.kind === 'ammeter') {
      rec.U = v[e2.a] - v[e2.b]
      rec.I = I[srcIndex++]
      rec.P = rec.U * rec.I
      rec.live = true
    } else if (e2.kind === 'switch') {
      rec.U = v[e2.a] - v[e2.b]
      rec.I = I[srcIndex++]
      rec.P = rec.U * rec.I
      rec.live = true
    } else if (e2.kind === 'battery') {
      rec.U = v[e2.a] - v[e2.b]
      rec.I = I[srcIndex++]
      rec.P = -rec.U * rec.I // 电源对外输出功率
      rec.live = true
    } else {
      var bR = rbrc[rIndex]
      rIndex++
      rec.U = v[e2.a] - v[e2.b]
      rec.I = bR.R > 0 ? rec.U / bR.R : 0
      rec.P = rec.U * rec.I
      rec.live = true
    }
    per.push(rec)
  }

  // ---- 6. 总览 ----
  var total = { U: 0, I: 0, R: 0, P: 0 }
  var found = false
  for (i = 0; i < el.length; i++) {
    if (el[i].kind === 'battery') {
      total.U = el[i].value || 0
      total.I = Math.abs(per[i].I)
      found = true
      break
    }
  }
  if (found) {
    total.R = total.I > 1e-9 ? total.U / total.I : Infinity
    total.P = total.U * total.I
  } else {
    // 无电源时统计外电路总功率
    var sp = 0
    for (i = 0; i < per.length; i++) {
      if (per[i].kind !== 'battery' && per[i].kind !== 'wire') sp += per[i].P
    }
    total.P = sp
  }

  // ---- 7. 状态判定 ----
  var state = 'ok'
  var message = '电路正常工作'
  if (found) {
    if (total.I < 1e-7) {
      state = 'open'
      message = '电路断路：没有形成闭合回路，电流为零'
    } else if (total.R < 0.05) {
      state = 'short'
      message = '电路短路：电源被导线直接接通，等效电阻接近 0'
    }
  }

  return {
    ok: true,
    state: state,
    message: message,
    v: v,
    I: I,
    per: per,
    total: total,
    ground: ground,
    hasSource: found
  }
}

/**
 * 计算某元件接入电路后的等效电阻：在 a、b 之间加 1A 电流源，
 * 求出 ab 间电压即为等效电阻。用于「滑动变阻器接入阻值」以外的场合。
 */
export function equivalentResistance(elements, a, b) {
  // 在 ab 间串入 1Ω 电阻并加 1V 电源，ab 间电压即等效电阻（Ω）
  var list = elements.slice()
  list.push({ kind: 'resistor', a: a, b: b, value: 1 })
  list.push({ kind: 'battery', a: a, b: b, value: 1 })
  var r = solve(list, {})
  if (!r.ok) return Infinity
  return Math.abs(r.v[a] - r.v[b])
}
