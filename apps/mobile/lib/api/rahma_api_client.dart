library;

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

import '../config.dart';

class RahmaApiError implements Exception {
  RahmaApiError(this.code, this.messageAr);
  final String code;
  final String messageAr;
  @override
  String toString() => 'RahmaApiError($code): $messageAr';
}

class RahmaApiClient {
  RahmaApiClient({http.Client? client}) : _http = client ?? http.Client();

  final http.Client _http;

  bool get isConfigured => RahmaConfig.isApiConfigured;

  Future<Map<String, dynamic>> get(String path) async {
    return _withRetry(() async {
      final uri = Uri.parse('${RahmaConfig.apiBase}$path');
      final response = await _http.get(uri).timeout(const Duration(seconds: 10));
      return _decode(response);
    });
  }

  Future<Map<String, dynamic>> postJson(String path, Map<String, dynamic> body) async {
    return _withRetry(() async {
      final uri = Uri.parse('${RahmaConfig.apiBase}$path');
      final response = await _http.post(
        uri,
        headers: {'Content-Type': 'application/json; charset=utf-8'},
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 10));
      return _decode(response);
    });
  }

  Future<Map<String, dynamic>> _withRetry(Future<Map<String, dynamic>> Function() action, {int maxRetries = 3}) async {
    if (!isConfigured) {
      throw RahmaApiError(
        'api_not_configured',
        'الخدمة غير مهيأة بعد. لم يتم تكوين عنوان الـ API.',
      );
    }

    int attempts = 0;
    while (true) {
      try {
        attempts++;
        return await action();
      } catch (e) {
        if (attempts >= maxRetries) rethrow;
        // Simple delay before retry
        await Future.delayed(Duration(milliseconds: 500 * attempts));
      }
    }
  }

  Map<String, dynamic> _decode(http.Response response) {
    Map<String, dynamic> parsed;
    try {
      parsed = jsonDecode(response.body) as Map<String, dynamic>;
    } on FormatException {
      throw RahmaApiError(
        'invalid_response',
        'حدث خطأ في قراءة الاستجابة من الخادم.',
      );
    }
    if (response.statusCode >= 400) {
      throw RahmaApiError(
        (parsed['error'] as String?) ?? 'unknown_error',
        (parsed['safe_message_ar'] as String?) ??
            'حدث خطأ غير متوقع. يُرجى المحاولة لاحقاً.',
      );
    }
    return parsed;
  }

  // -------- Convenience endpoint wrappers ------------------------------------

  Future<Map<String, dynamic>> health()        => get('/health');
  Future<Map<String, dynamic>> ready()         => get('/ready');
  Future<Map<String, dynamic>> mobileStatus()  => get('/api/mobile/status');
  Future<Map<String, dynamic>> contentSources()=> get('/api/content/sources');
  Future<Map<String, dynamic>> publicAnswers() => get('/api/public/answers');
  Future<Map<String, dynamic>> quran()         => get('/api/quran');
  Future<Map<String, dynamic>> hadith()        => get('/api/hadith');
  Future<Map<String, dynamic>> dua()           => get('/api/dua');
  Future<Map<String, dynamic>> gameStatus()    => get('/api/game/status');

  Future<Map<String, dynamic>> submitQuestion(String questionAr, {String? categoryAr}) =>
      postJson('/api/sheikh/questions', {
        'question_ar': questionAr,
        if (categoryAr != null) 'category_ar': categoryAr,
        'language': 'ar',
      });
}
