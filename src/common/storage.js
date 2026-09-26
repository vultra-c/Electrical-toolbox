/**
 * 本地存储封装：电路草稿、收藏、设置
 */
import storage from '@system.storage'

var PREFIX = 'EB_'

export default {
  get: function (key, def) {
    return new Promise(function (resolve) {
      storage.get({
        key: PREFIX + key,
        success: function (data) {
          if (!data || data === '' || data === 'null') {
            resolve(def)
            return
          }
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            resolve(def)
          }
        },
        fail: function () { resolve(def) }
      })
    })
  },

  set: function (key, value) {
    return new Promise(function (resolve) {
      storage.set({
        key: PREFIX + key,
        value: JSON.stringify(value),
        success: function () { resolve(true) },
        fail: function () { resolve(false) }
      })
    })
  },

  remove: function (key) {
    return new Promise(function (resolve) {
      storage.delete({
        key: PREFIX + key,
        success: function () { resolve(true) },
        fail: function () { resolve(false) }
      })
    })
  }
}
