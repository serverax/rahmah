import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val releaseKeystoreProperties = Properties()
val releaseKeystorePropertiesFile = rootProject.file("key.properties")
val hasReleaseKeystoreProperties = releaseKeystorePropertiesFile.exists()

if (hasReleaseKeystoreProperties) {
    releaseKeystoreProperties.load(FileInputStream(releaseKeystorePropertiesFile))
}

android {
    namespace = "com.serverax.rahma.rahma"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.serverax.rahma.rahma"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            if (!hasReleaseKeystoreProperties) {
                throw GradleException("Missing android/key.properties for release signing. Copy key.properties.example and point it to a private JKS file.")
            }

            keyAlias = releaseKeystoreProperties["keyAlias"] as String
            keyPassword = releaseKeystoreProperties["keyPassword"] as String
            storeFile = file(releaseKeystoreProperties["storeFile"] as String)
            storePassword = releaseKeystoreProperties["storePassword"] as String
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
}

