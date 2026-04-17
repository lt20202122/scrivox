package com.scrivox.app.keyboard

import android.content.SharedPreferences
import android.graphics.Color
import android.graphics.Typeface
import android.inputmethodservice.InputMethodService
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.content.Intent
import android.os.Bundle
import java.io.File

class ScrivoxIME : InputMethodService() {

    private lateinit var prefs: SharedPreferences
    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false
    private var currentText = ""

    private lateinit var previewText: TextView
    private lateinit var micButton: Button
    private lateinit var insertButton: Button

    override fun onCreateInputView(): View {
        prefs = getSharedPreferences("scrivox_keyboard", MODE_PRIVATE)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#F5F0E8"))
            setPadding(16, 12, 16, 16)
        }

        previewText = TextView(this).apply {
            text = "Tap 🎙️ to dictate…"
            textSize = 20f
            setTextColor(Color.parseColor(prefs.getString("inkColour", "#1a1a1a") ?: "#1a1a1a"))
            loadCustomFont()?.let { typeface = it }
            setPadding(8, 8, 8, 8)
            minHeight = 56
        }
        root.addView(previewText, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
        ))

        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER
            setPadding(0, 8, 0, 0)
        }

        micButton = Button(this).apply {
            text = "🎙️"
            textSize = 28f
            setBackgroundColor(Color.parseColor("#8b6914"))
            setTextColor(Color.WHITE)
            setOnClickListener { toggleRecording() }
        }
        row.addView(micButton, LinearLayout.LayoutParams(120, 120).apply { marginEnd = 24 })

        insertButton = Button(this).apply {
            text = "Insert"
            setBackgroundColor(Color.parseColor("#3a7a3a"))
            setTextColor(Color.WHITE)
            setOnClickListener { doInsert() }
        }
        row.addView(insertButton)

        root.addView(row)
        return root
    }

    private fun loadCustomFont(): Typeface? {
        val path = prefs.getString("selectedFontPath", null) ?: return null
        return try { Typeface.createFromFile(File(path)) } catch (e: Exception) { null }
    }

    private fun toggleRecording() {
        if (isListening) stopListening() else startListening()
    }

    private fun startListening() {
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        speechRecognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {
                isListening = false
                micButton.setBackgroundColor(Color.parseColor("#8b6914"))
            }
            override fun onError(error: Int) {
                isListening = false
                micButton.setBackgroundColor(Color.parseColor("#8b6914"))
            }
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    currentText = matches[0]
                    previewText.text = currentText
                }
            }
            override fun onPartialResults(partialResults: Bundle?) {
                val partial = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!partial.isNullOrEmpty()) previewText.text = partial[0]
            }
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }
        speechRecognizer?.startListening(intent)
        isListening = true
        micButton.setBackgroundColor(Color.parseColor("#c0392b"))
    }

    private fun stopListening() {
        speechRecognizer?.stopListening()
        speechRecognizer?.destroy()
        isListening = false
        micButton.setBackgroundColor(Color.parseColor("#8b6914"))
    }

    private fun doInsert() {
        if (currentText.isNotEmpty()) {
            currentInputConnection?.commitText(currentText, 1)
            currentText = ""
            previewText.text = "Tap 🎙️ to dictate…"
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        speechRecognizer?.destroy()
    }
}
