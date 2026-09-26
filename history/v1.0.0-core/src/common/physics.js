/**
 * 九年级电学公式库 / 解题工具
 * 所有输入输出统一使用国际单位（V / A / Ω / W / J / s）
 */

/* ---------------------------------------------------------------- 欧姆定律 */
export function ohm({ U, I, R, find }) {
  var res = { find: find, steps: [], ok: false, err: '' }
  if (find === 'I') {
    if (!R) { res.err = '电阻为 0，无法求电流'; return res }
    res.steps.push('I = U / R = ' + U + ' / ' + R)
    res.I = U / R
    res.ok = true
  } else if (find === 'U') {
    if (!I) { res.err = '电流为 0，无法求电压'; return res }
    res.steps.push('U = I × R = ' + I + ' × ' + R)
    res.U = I * R
    res.ok = true
  } else {
    if (!I) { res.err = '电流为 0，无法求电阻'; return res }
    res.steps.push('R = U / I = ' + U + ' / ' + I)
    res.R = U / I
    res.ok = true
  }
  return res
}

/* ------------------------------------------------- 串联电路（可多只电阻） */
export function series(list, U) {
  var R = 0
  var n = 0
  for (var i = 0; i < list.length; i++) {
    R += list[i]
    n++
  }
  var out = { R: R, count: n, I: 0, U: U, per: [], totalP: 0 }
  out.I = R > 0 ? U / R : 0
  for (var j = 0; j < list.length; j++) {
    var u = out.I * list[j]
    out.per.push({ R: list[j], I: out.I, U: u, P: u * out.I })
    out.totalP += u * out.I
  }
  return out
}

/* ------------------------------------------------- 并联电路（可多只电阻） */
export function parallel(list, U) {
  var n = list.length
  var inv = 0
  var i
  for (i = 0; i < n; i++) {
    if (list[i] > 0) inv += 1 / list[i]
  }
  var R = inv > 0 ? 1 / inv : Infinity
  var out = { R: R, count: n, U: U, per: [], Itot: 0, totalP: 0 }
  for (i = 0; i < n; i++) {
    var cur = list[i] > 0 ? U / list[i] : 0
    out.per.push({ R: list[i], I: cur, U: U, P: U * cur })
    out.Itot += cur
    out.totalP += U * cur
  }
  return out
}

/* -------------------------------------------- 串并联混合：R1 串 (R2//R3…) */
export function mixed(R1, par, U) {
  var p = parallel(par, U)
  var R = R1 + p.R
  var I = R > 0 ? U / R : 0
  var U1 = I * R1
  return {
    R: R,
    R1: R1,
    Rp: p.R,
    Itot: I,
    U1: U1,
    Upar: U - U1,
    per: p.per,
    P1: U1 * I,
    Ppar: p.totalP
  }
}

/* ---------------------------------------------------------------- 电功率 */
export function power({ U, I, R, find, t }) {
  var res = { find: find, steps: [], ok: false, err: '' }
  if (find === 'P') {
    // 已知 U、I（可另给 R 供展示）
    res.steps.push('P = U × I = ' + trim(U) + ' × ' + trim(I) + ' = ' + trim(U * I) + ' W')
    res.P = U * I
  } else if (find === 'P2') {
    if (!R) { res.err = '电阻为 0，无法求功率'; return res }
    res.steps.push('P = I² × R = ' + trim(I) + '² × ' + trim(R) + ' = ' + trim(I * I * R) + ' W')
    res.P = I * I * R
  } else {
    if (!R) { res.err = '电阻为 0，无法求功率'; return res }
    res.steps.push('P = U² / R = ' + trim(U) + '² / ' + trim(R) + ' = ' + trim(U * U / R) + ' W')
    res.P = (U * U) / R
  }
  res.ok = true
  res.W = t ? res.P * t : 0
  return res
}

function trim(n) {
  return String(parseFloat(parseFloat(n).toPrecision(5)))
}

/* ------------------------------------------------ 额定功率 / 实际功率题 */
export function rated({ Ue, Pe, U, R }) {
  var out = { Ue: Ue, Pe: Pe, U: U, R: R }
  // 灯丝电阻 R = Ue²/Pe
  out.R = (Ue * Ue) / Pe
  if (U) {
    out.I = U / out.R
    out.P = (U * U) / out.R
    out.ratio = out.P / Pe
    if (out.ratio > 1) out.bright = '比额定亮度亮'
    else if (out.ratio < 1) out.bright = '比额定亮度暗'
    else out.bright = '与额定亮度相同'
  }
  return out
}

/* ---------------------------------------------------------------- 电能 */
export function energy({ P, t, U, I, find }) {
  var out = { steps: [], ok: false }
  if (find === 'W') {
    out.steps.push('W = P × t = ' + P + ' × ' + t)
    out.W = P * t
  } else if (find === 't') {
    if (!P) { out.err = '功率为 0'; return out }
    out.steps.push('t = W / P = ' + U + ' / ' + P)
    out.t = U / P
    out.W = U
  } else {
    if (!U) { out.err = '电压为 0'; return out }
    out.steps.push('P = W / t = ' + U + ' / ' + t)
    out.P = U / t
    out.W = U
  }
  out.kWh = out.W / 3.6e6
  out.ok = true
  return out
}

/* ------------------------------------------------------------ 焦耳定律 */
export function joule({ I, R, t, find, U }) {
  var out = { steps: [], ok: false }
  if (find === 'Q') {
    out.steps.push('Q = I² × R × t = ' + I + '² × ' + R + ' × ' + t)
    out.Q = I * I * R * t
    out.steps.push('也可由 Q = W = P × t 检验：P = I²R')
  } else if (find === 'Q2') {
    out.steps.push('Q = W = U × I × t = ' + U + ' × ' + I + ' × ' + t)
    out.Q = U * I * t
  } else {
    out.steps.push('I = Q / (R × t)')
    out.I = Math.sqrt(U / (R * t))
  }
  out.ok = true
  return out
}

/* ----------------------------------------------------- 热效率 / 电热器 */
export function heatEfficiency({ Quse, Qget }) {
  var eta = Qget > 0 ? Quse / Qget : 0
  return { eta: eta, Quse: Quse, Qget: Qget, Qloss: Qget - Quse }
}

/* ------------------------------------------------------------ 电能表题 */
export function meter({ n, c, t, price }) {
  // n: 电能表标定电流(A)，c: 3000r/kWh 等常数，t: 分钟
  var revPerMin = (c * n) / 60000 * 1000
  return { revPerMin: revPerMin, revPerHour: revPerMin * 60 }
}

/* ------------------------------------------------- 伏安法测电阻（两挡） */
/**
 * 伏安法测电阻误差分析
 * find: 'inner' 内接法（电流表内接，电压表跨 Rx+Ra）
 *       'outer' 外接法（电压表外接，电流表测干路）
 * 内接：R测 = Rx·Rv/(Rx+Rv) < Rx   适合测大电阻
 * 外接：R测 = Rx + Ra·Rx/(Rx+Rv) ≈ Rx+Ra > Rx  适合测小电阻
 */
export function voltammetry({ Rv, Ra, Rx, find }) {
  var out = { Rv: Rv, Ra: Ra, Rx: Rx }
  if (find === 'inner') {
    out.Rm = (Rx * Rv) / (Rx + Rv)
    out.rel = (Rv - out.Rm) / out.Rm * 100
    out.dev = out.rel >= 0 ? '偏大' : '偏小'
    out.fit = '适合测量大电阻（Rx ≫ Rv）'
    out.steps = [
      'R测 = U/I = Rx·Rv/(Rx+Rv) = ' + trim(out.Rm) + ' Ω',
      '电压表分流使电流表读数偏小 → 测得电阻偏小',
      '相对误差 ' + trim(out.rel) + '%'
    ]
  } else {
    out.Rm = Rx + (Ra * Rx) / (Rx + Rv)
    out.rel = (out.Rm - Rx) / Rx * 100
    out.dev = '偏大'
    out.fit = '适合测量小电阻（Rx ≪ Rv）'
    out.steps = [
      'R测 = Rx + Ra·Rx/(Rx+Rv) = ' + trim(out.Rm) + ' Ω',
      '电流表分压使电压表读数偏大 → 测得电阻偏大',
      '相对误差 ' + trim(out.rel) + '%'
    ]
  }
  return out
}

/* --------------------------------------------- 滑动变阻器限流/分压接法 */
/**
 * 滑动变阻器两种接法的调节范围
 * limit 限流接法：变阻器与定值电阻串联
 *   R总 ∈ [R0, R0+Rmax]  I ∈ [U/(R0+Rmax), U/R0]  U_R0 ∈ [U·R0/(R0+Rmax), U]
 * divider 分压接法：变阻器全段接在电源上，负载取分压
 *   U_load ∈ [U·R0/(R0+Rmax), U·Rload/(Rload+Rmax)]（要求 Rload ≪ Rmax）
 */
export function rheostatCalc({ R0, Rmax, Rload, U, mode }) {
  var out = { R0: R0, Rmax: Rmax, Rload: Rload, U: U, mode: mode }
  if (mode === 'limit') {
    out.Rmin = R0
    out.Rmax = R0 + Rmax
    out.Imin = U / out.Rmax
    out.Imax = U / out.Rmin
    out.Umin = out.Imin * R0
    out.Umax = out.Imax * R0
    out.Pmax = (U * U) / out.Rmin
  } else {
    out.Umin = (U * R0) / (R0 + Rmax)
    out.Umax = (U * Rload) / (Rload + Rmax)
    if (out.Umax < out.Umin) { var t = out.Umin; out.Umin = out.Umax; out.Umax = t }
    out.Imin = Rload ? out.Umin / Rload : 0
    out.Imax = Rload ? out.Umax / Rload : 0
    out.note = '分压接法电压范围更大，题目要求「电压从 0 调到额定值」时必须用分压'
  }
  return out
}

/* -------------------------------------------- 滑动变阻器滑片移动后各量 */
/**
 * 滑片移动后各表示数变化（限流接法，Rvar 在 0 ~ Rmax 之间变化）
 * bigger: true 表示接入电阻变大
 */
export function sliderMove({ U, Rfixed, Rvar, bigger }) {
  var R = Rfixed + (bigger ? Rvar : 0)
  var I = R > 0 ? U / R : 0
  var R2 = Rfixed + (bigger ? 0 : Rvar)
  var I2 = R2 > 0 ? U / R2 : 0
  var imax = Math.max(I, I2)
  var imin = Math.min(I, I2)
  return {
    Imin: imin,
    Imax: imax,
    Umin: imin * Rfixed,
    Umax: imax * Rfixed,
    Pmax: imax * imax * Rfixed
  }
}

/* ------------------------------------------------------- 图像/表格判断题 */
/* 常见题型：滑动变阻器滑片移动时，各电表示数如何变化 */
export function trend(movingUp) {
  // movingUp: 滑片向上（接入电阻变大）
  return {
    I: movingUp ? '减小' : '增大',
    Ufixed: movingUp ? '减小' : '增大',
    Uvar: movingUp ? '增大' : '减小',
    P: movingUp ? '减小' : '增大'
  }
}

/* ----------------------------------------------- 电阻箱读数（旋钮式） */
export function resistanceBox(dials) {
  // dials: 各旋钮示数 0-9
  var mul = [1000, 100, 10, 1, 0.1]
  var R = 0
  var text = ''
  for (var i = 0; i < dials.length; i++) {
    R += dials[i] * (mul[i] || 1)
    text += dials[i]
  }
  return { R: R, text: text }
}

/* --------------------------------------------------------- 单位换算器 */
export function convert(quantity, value, fromLabel, toLabel) {
  var list = unitListOf(quantity)
  var f = 1
  var t = 1
  for (var i = 0; i < list.length; i++) {
    if (list[i].label === fromLabel) f = list[i].mul
    if (list[i].label === toLabel) t = list[i].mul
  }
  return (value * f) / t
}

function unitListOf(q) {
  var map = {
    I: [['A', 1], ['mA', 1e-3], ['μA', 1e-6]],
    U: [['V', 1], ['mV', 1e-3], ['kV', 1e3]],
    R: [['Ω', 1], ['kΩ', 1e3], ['MΩ', 1e6]],
    P: [['W', 1], ['mW', 1e-3], ['kW', 1e3]],
    E: [['J', 1], ['kJ', 1e3], ['kW·h', 3.6e6]],
    t: [['s', 1], ['min', 60], ['h', 3600]]
  }
  var raw = map[q] || [['SI', 1]]
  var out = []
  for (var i = 0; i < raw.length; i++) out.push({ label: raw[i][0], mul: raw[i][1] })
  return out
}
