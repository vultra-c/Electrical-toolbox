/**
 * 数字键盘状态机
 *
 * 各页面共用的输入逻辑：维护 buffer（当前输入的字符串），
 * 暴露 press(key) / confirm() / clear()，并通过 onChange 回调把
 * 结果交回页面刷新。避免在每个页面重复写一遍键盘逻辑。
 */
export default {
  initial: '0',

  /** 按下一个键 */
  press: function (state, key) {
    var b = state.buffer
    if (key === 'C') return '0'
    if (key === '<') {
      if (b.length <= 1) return '0'
      return b.slice(0, -1)
    }
    if (key === '.') {
      if (b.indexOf('.') >= 0) return b
      return b === '0' ? '0.' : b + '.'
    }
    if (key === '±') {
      return b.charAt(0) === '-' ? b.slice(1) : '-' + b
    }
    if (b === '0') return key
    // 限制长度，避免超长数字
    if (b.replace('-', '').replace('.', '').length >= 9) return b
    return b + key
  },

  /** 确认：转成数字 */
  confirm: function (state) {
    var v = parseFloat(state.buffer)
    if (isNaN(v)) v = 0
    return v
  },

  isEmpty: function (state) {
    return state.buffer === '' || state.buffer === '-'
  }
}
