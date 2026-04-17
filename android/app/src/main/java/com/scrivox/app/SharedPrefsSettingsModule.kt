package com.scrivox.app

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class SharedPrefsSettingsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SharedPrefsSettings"

    @ReactMethod
    fun setValues(values: ReadableMap) {
        val prefs = reactApplicationContext
            .getSharedPreferences("scrivox_keyboard", Context.MODE_PRIVATE)
        val editor = prefs.edit()
        val iter = values.keySetIterator()
        while (iter.hasNextKey()) {
            val key = iter.nextKey()
            editor.putString(key, values.getString(key))
        }
        editor.apply()
    }
}
