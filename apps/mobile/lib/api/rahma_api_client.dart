/// Rahma mobile — minimal typed API client foundation.
///
/// Reads the API base URL from [RahmaConfig.apiBase]. Refuses to talk to
/// the network when the base URL is empty (the build-time default).
///
/// No third-party HTTP dependency required for the foundation — uses the
/// stdlib `dart:io` HttpClient. Operator may swap in `package:dio` or
/// `package:http` once the dependency policy is set.
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import '../config.dart';

class RahmaApiError implements Exception {
  RahmaApiError(this.code, this.messageAr);
  final String code;
  final String messageAr;
  @override
  String toString() => 'RahmaApiError($code): $messageAr';
}

class RahmaApiClient {
  RahmaApiClient({HttpClient? httpClient}) : _http = httpClient ?? HttpClient();

  final HttpClient _http;

  bool get isConfigured => RahmaConfig.isApiConfigured;

  Future<Map<String, dynamic>> get(String path) async {
    if (!isConfigured) {
      throw RahmaApiError(
        'api_not_configured',
        'الخدمة غير مهيأة بعد. لم يتم تكوين عنوان الـ API.',
      );
    }
    final uri = Uri.parse('${RahmaConfig.apiBase}$path');
    final request = await _http.getUrl(uri);
    final response = await request.close();
    return _decode(response);
  }

  Future<Map<String, dynamic>> postJson(String path, Map<String, dynamic> body) async {
    if (!isConfigured) {
      throw RahmaApiError(
        'api_not_configured',
        'الخدمة غير مهيأة بعد. لم يتم تكوين عنوان الـ API.',
      );
    }
    final uri = Uri.parse('${RahmaConfig.apiBase}$path');
    final request = await _http.postUrl(uri);
    request.headers.contentType = ContentType('application', 'json', charset: 'utf-8');
    request.add(utf8.encode(jsonEncode(body)));
    final response = await request.close();
    return _decode(response);
  }

  Future<Map<String, dynamic>> _decode(HttpClientResponse response) async {
    final raw = await response.transform(utf8.decoder).join();
    Map<String, dynamic> parsed;
    try {
      parsed = jsonDecode(raw) as Map<String, dynamic>;
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
