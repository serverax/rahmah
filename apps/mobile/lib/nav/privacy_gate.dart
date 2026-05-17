import 'dart:ui';
import 'package:flutter/material.dart';

/// A widget that obfuscates its child when [isEnabled] is true.
///
/// Used for "Privacy Mode" to hide sensitive religious questions/answers
/// in public spaces.
class PrivacyGate extends StatelessWidget {
  const PrivacyGate({
    super.key,
    required this.child,
    required this.isEnabled,
    this.blurSigma = 10.0,
  });

  final Widget child;
  final bool isEnabled;
  final double blurSigma;

  @override
  Widget build(BuildContext context) {
    if (!isEnabled) return child;

    return Stack(
      children: [
        child,
        Positioned.fill(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
            child: Container(
              color: Colors.white.withOpacity(0.1),
              alignment: Alignment.center,
              child: const Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.visibility_off, color: Colors.grey),
                  SizedBox(height: 8),
                  Text(
                    'وضع الخصوصية مفعل',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
