/**
 * 数字键盘状态机
 *
 * 各页面共用的输入逻辑：维护 buffer（当前输入的字符串），
 * started 表示本次打开键盘后是否已经敲过键。
 * 打开键盘时 buffer 会预填原值，但用户第一次敲数字键时应该
 * 直接替换而不是追加（否则「6」再按「1」会变成「61」）。
 */
export default {
  /**
   * 按下一个键
   * @param state { buffer, started }
   * @param key   0-9 . C < ±
   */
  press: function (state, key) {
    if (key === 'C') return '0'
    if (key === '<') {
      if (!state.started) return '0'
      if (state.buffer.length <= 1) return '0'
      return state.buffer.slice(0, -1)
    }
    if (key === '±') {
      return state.buffer.charAt(0) === '-' ? state.buffer.slice(1) : '-' + state.buffer
    }
    if (key === '.') {
      if (state.buffer.indexOf('.') >= 0) return state.buffer
      if (!state.started) return '0.'
      return state.buffer === '0' ? '0.' : state.buffer + '.'
    }
    // 第一次敲数字：直接替换预填值
    if (!state.started) return key
    if (state.buffer === '0') return key
    // 限制长度，避免超长数字
    if (state.buffer.replace('-', '').replace('.', '').length >= 9) return state.buffer
    return state.buffer + key
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
