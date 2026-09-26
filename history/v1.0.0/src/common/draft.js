/**
 * 线路图草稿在页面间共享
 * （router 传参对复杂对象不可靠，这里用一个模块级单例传递求解结果）
 */
export default {
  elements: [],
  name: '我的电路',
  result: null
}

/** 网格：4 列 × 4 行，节点编号 = r * 4 + c */
export var PRESETS = [
  {
    id: 'series',
    name: '串联电路',
    desc: 'R1、R2、R3 串联接在电源两端',
    els: [
      ['h', 0, 0, 'battery', 3, 1],
      ['h', 0, 1, 'switch', 0, 1],
      ['h', 0, 2, 'resistor', 10, 1],
      ['v', 0, 3, 'wire', 0, 1],
      ['v', 1, 3, 'wire', 0, 1],
      ['v', 2, 3, 'wire', 0, 1],
      ['h', 3, 2, 'wire', 0, 1],
      ['h', 3, 1, 'resistor', 10, 1],
      ['h', 3, 0, 'resistor', 20, 1],
      ['v', 2, 0, 'wire', 0, 1],
      ['v', 1, 0, 'wire', 0, 1],
      ['v', 0, 0, 'wire', 0, 1]
    ]
  },
  {
    id: 'parallel',
    name: '并联电路',
    desc: '两条支路并联，上支路带开关',
    els: [
      ['h', 3, 0, 'battery', 6, 1],
      ['h', 3, 1, 'wire', 0, 1],
      ['h', 3, 2, 'wire', 0, 1],
      ['v', 0, 0, 'wire', 0, 1],
      ['v', 1, 0, 'wire', 0, 1],
      ['v', 2, 0, 'wire', 0, 1],
      ['v', 0, 3, 'wire', 0, 1],
      ['v', 1, 3, 'wire', 0, 1],
      ['v', 2, 3, 'wire', 0, 1],
      ['h', 0, 0, 'resistor', 10, 1],
      ['h', 0, 1, 'switch', 0, 1],
      ['h', 0, 2, 'wire', 0, 1],
      ['h', 1, 0, 'wire', 0, 1],
      ['h', 1, 1, 'resistor', 20, 1],
      ['h', 1, 2, 'wire', 0, 1]
    ]
  },
  {
    id: 'va',
    name: '伏安法测电阻',
    desc: '电流表串联、电压表并联在 Rx 两端',
    els: [
      ['h', 3, 0, 'battery', 6, 1],
      ['h', 3, 1, 'wire', 0, 1],
      ['h', 3, 2, 'wire', 0, 1],
      ['v', 0, 0, 'wire', 0, 1],
      ['v', 1, 0, 'switch', 0, 1],
      ['v', 2, 0, 'wire', 0, 1],
      ['v', 0, 3, 'wire', 0, 1],
      ['v', 1, 3, 'wire', 0, 1],
      ['v', 2, 3, 'wire', 0, 1],
      ['h', 0, 0, 'ammeter', 0, 1],
      ['h', 0, 1, 'resistor', 10, 1],
      ['h', 0, 2, 'wire', 0, 1],
      ['v', 0, 1, 'wire', 0, 1],
      ['h', 1, 1, 'voltmeter', 0, 1],
      ['v', 0, 2, 'wire', 0, 1]
    ]
  },
  {
    id: 'rheoLimit',
    name: '滑变限流接法',
    desc: '滑动变阻器与定值电阻串联限流',
    els: [
      ['h', 0, 0, 'battery', 6, 1],
      ['h', 0, 1, 'rheostat', 10, 1],
      ['h', 0, 2, 'resistor', 10, 1],
      ['v', 0, 3, 'wire', 0, 1],
      ['v', 1, 3, 'wire', 0, 1],
      ['v', 2, 3, 'wire', 0, 1],
      ['h', 3, 2, 'wire', 0, 1],
      ['h', 3, 1, 'wire', 0, 1],
      ['h', 3, 0, 'wire', 0, 1],
      ['v', 2, 0, 'wire', 0, 1],
      ['v', 1, 0, 'switch', 0, 1],
      ['v', 0, 0, 'wire', 0, 1]
    ]
  },
  {
    id: 'rheoDiv',
    name: '滑变分压接法',
    desc: '变阻器分上下两段，负载接在滑片与负极之间',
    els: [
      ['h', 0, 0, 'battery', 6, 1],
      ['h', 0, 1, 'rheostat', 10, 1],
      ['h', 0, 2, 'rheostat', 10, 1],
      ['v', 0, 0, 'wire', 0, 1],
      ['v', 1, 0, 'wire', 0, 1],
      ['v', 2, 0, 'wire', 0, 1],
      ['v', 0, 3, 'wire', 0, 1],
      ['v', 1, 3, 'wire', 0, 1],
      ['v', 2, 3, 'wire', 0, 1],
      ['h', 3, 2, 'wire', 0, 1],
      ['h', 3, 1, 'wire', 0, 1],
      ['h', 3, 0, 'wire', 0, 1],
      ['v', 0, 2, 'wire', 0, 1],
      ['v', 1, 2, 'resistor', 10, 1],
      ['v', 2, 2, 'wire', 0, 1]
    ]
  },
  {
    id: 'mixed',
    name: '串并联混合',
    desc: 'R1 串联 (R2 与小灯泡并联)',
    els: [
      ['h', 0, 0, 'battery', 9, 1],
      ['h', 0, 1, 'resistor', 5, 1],
      ['h', 0, 2, 'resistor', 6, 1],
      ['v', 0, 2, 'wire', 0, 1],
      ['h', 1, 2, 'lamp', 8, 1],
      ['v', 0, 3, 'wire', 0, 1],
      ['v', 1, 3, 'wire', 0, 1],
      ['v', 2, 3, 'wire', 0, 1],
      ['h', 3, 2, 'wire', 0, 1],
      ['h', 3, 1, 'wire', 0, 1],
      ['h', 3, 0, 'wire', 0, 1],
      ['v', 2, 0, 'wire', 0, 1],
      ['v', 1, 0, 'wire', 0, 1],
      ['v', 0, 0, 'wire', 0, 1]
    ]
  }
]

/** 把预设展开成元件数组 */
export function expand(preset) {
  var out = []
  for (var i = 0; i < preset.els.length; i++) {
    var d = preset.els[i]
    var a = d[1] * 4 + d[2]
    var b = d[0] === 'h' ? a + 1 : a + 4
    out.push({
      kind: d[3],
      value: d[4],
      closed: d[5] === 1,
      rin: 0,
      a: a,
      b: b,
      dir: d[0],
      r: d[1],
      c: d[2]
    })
  }
  return out
}
