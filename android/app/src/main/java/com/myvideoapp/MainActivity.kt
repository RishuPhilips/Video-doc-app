
package com.myvideoapp

import android.content.res.Configuration
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

// ✅ Import VideoSDK PiP module
import live.videosdk.pipmode.AndroidPipModule

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "MyVideoApp"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // ✅ Notify JS when user enters/exits PiP
  override fun onPictureInPictureModeChanged(
      isInPictureInPictureMode: Boolean,
      newConfig: Configuration
  ) {
      super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
      AndroidPipModule.pipModeChanged(isInPictureInPictureMode)
  }

  // ✅ (Optional) Allow system “auto PiP” request flows (gesture/Home)
  override fun onPictureInPictureRequested(): Boolean {
      AndroidPipModule.pipModeReq()
      return true
  }
}