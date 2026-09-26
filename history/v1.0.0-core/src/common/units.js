/**
 * 单位与数字格式化工具
 */

export var PREFIX = [
  { name: 'G', mul: 1e9, label: 'G' },
  { name: 'M', mul: 1e6, label: 'M' },
  { name: 'k', mul: 1e3, label: 'k' },
  { name: '', mul: 1, label: '' },
  { name: 'm', mul: 1e-3, label: 'm' },
  { name: 'μ', mul: 1e-6, label: 'μ' }
]

/** 各物理量可选单位（value 以国际单位为基准存储，展示时按需换算） */
export var UNITS = {
  I: [
    { label: 'A', mul: 1 },
    { label: 'mA', mul: 1e-3 },
    { label: 'μA', mul: 1e-6 }
  ],
  U: [
    { label: 'V', mul: 1 },
    { label: 'mV', mul: 1e-3 },
    { label: 'kV', mul: 1e3 }
  ],
  R: [
    { label: 'Ω', mul: 1 },
    { label: 'kΩ', mul: 1e3 },
    { label: 'MΩ', mul: 1e6 }
  ],
  P: [
    { label: 'W', mul: 1 },
    { label: 'mW', mul: 1e-3 },
    { label: 'kW', mul: 1e3 }
  ],
  E: [
    { label: 'J', mul: 1 },
    { label: 'kJ', mul: 1e3 },
    { label: 'kW·h', mul: 3.6e6 }
  ],
  Q: [
    { label: 'J', mul: 1 },
    { label: 'kJ', mul: 1e3 }
  ],
  t: [
    { label: 's', mul: 1 },
    { label: 'min', mul: 60 },
    { label: 'h', mul: 3600 }
  ]
}

export function unitList(quantity) {
  return UNITS[quantity] || [{ label: '', mul: 1 }]
}

export function unitMul(quantity, label) {
  var list = unitList(quantity)
  for (var i = 0; i < list.length; i++) {
    if (list[i].label === label) return list[i].mul
  }
  return 1
}

/** 自动选一个合适的单位，返回 {label, value} */
export function autoUnit(quantity, si) {
  var list = unitList(quantity)
  var v = Math.abs(si)
  var best = list[0]
  for (var i = 0; i < list.length; i++) {
    var x = v / list[i].mul
    if (x >= 1 && x < 1000) { best = list[i]; break }
    if (x >= 1 && x < 1000) best = list[i]
  }
  return { label: best.label, value: si / best.mul }
}

/** 保留有效数字，避免浮点误差尾巴 */
export function sig(n, digits) {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return '—'
  if (n === 0) return '0'
  var d = digits || 4
  var abs = Math.abs(n)
  if (abs >= 1e7 || abs < 1e-4) {
    return n.toExponential(2).replace('e', '×10^')
  }
  var r = parseFloat(n.toPrecision(d))
  var s = String(r)
  if (s.indexOf('.') >= 0) {
    s = s.replace(/0+$/, '').replace(/\.$/, '')
  }
  return s
}

export function fmt(quantity, si, digits) {
  var a = autoUnit(quantity, si)
  return sig(a.value, digits || 4) + (a.label ? ' ' + a.label : '')
}

export function parseNum(s) {
  if (typeof s === 'number') return s
  if (!s) return NaN
  var t = String(s).trim().replace(/[，,]/g, '')
  t = t.replace(/[Ωω]/gi, '').replace(/[kKM]?(Ohm|ohm)/g, '')
  t = t.replace(/[VAvaWw]/g, '')
  var m = t.match(/^(-?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*([kKMμ]?)/)
  if (!m) return NaN
  var v = parseFloat(m[1])
  if (isNaN(v)) return NaN
  var sfx = m[2] || ''
  if (sfx === 'k' || sfx === 'K') v *= 1e3
  else if (sfx === 'M') v *= 1e6
  else if (sfx === 'μ') v *= 1e-6
  return v
}
