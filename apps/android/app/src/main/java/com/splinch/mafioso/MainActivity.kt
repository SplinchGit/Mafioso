package com.splinch.mafioso
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.ui.Modifier
import com.splinch.junction.feature.mafioso.ui.MafiosoScreen
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { Scaffold { insets -> MafiosoScreen("https://d2t8pi3n8wgmgj.cloudfront.net", Modifier.padding(insets)) } } }
    }
}
