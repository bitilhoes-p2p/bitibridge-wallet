package com.bitibridge.bitibridge_wallet

import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/**
 * FLAG_SECURE sob demanda.
 *
 * Com a flag ligada o Android impede captura de tela, gravacao e miniatura no
 * alternador de aplicativos. Ela e ligada nas telas que mostram as 12 palavras e
 * desligada no resto, para nao atrapalhar quem quer fotografar um endereco de
 * recebimento (que e publico e nao tem risco).
 */
class MainActivity : FlutterActivity() {
    private val channel = "com.bitibridge/secure_screen"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channel)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "enable" -> {
                        runOnUiThread {
                            window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                        }
                        result.success(true)
                    }
                    "disable" -> {
                        runOnUiThread {
                            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                        }
                        result.success(true)
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
