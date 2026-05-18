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
  Future<Map<String, dynamic>> prayerTimes(double lat, double lng) => get('/api/prayer-times?lat=$lat&lng=$lng');
  Future<Map<String, dynamic>> quranSurahs()   => get('/api/quran/surahs');
  Future<Map<String, dynamic>> quranSurahDetail(int id) => get('/api/quran/surahs/$id');
  Future<Map<String, dynamic>> gameStatus({String? ageGroup}) => get('/api/mobile/game/status${ageGroup != null ? '?age_group=$ageGroup' : ''}');
  Future<Map<String, dynamic>> libraryItems({String? category}) => get('/api/library/items${category != null ? '?category=$category' : ''}');
  Future<Map<String, dynamic>> azanAudioOptions() => get('/api/azan-audio/options');

  // Deprecated Aliases
  Future<Map<String, dynamic>> contentSources() => libraryItems();
  Future<Map<String, dynamic>> publicAnswers()  => listPublicQA();

  Future<Map<String, dynamic>> submitQuestion(String text, {String lang = 'ar', String displayPref = 'ar'}) =>
      postJson('/api/ask-sheikh/questions', {
        'question_text_$lang': text,
        'language': lang,
        'display_language_preference': displayPref,
      });

  Future<Map<String, dynamic>> listPublicQA({String? category, String lang = 'ar'}) =>
      get('/api/ask-sheikh/public?language=$lang${category != null ? '&category=$category' : ''}');
}
