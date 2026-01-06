//
//  ContentView.swift
//  CRM App
//
//  iOS wrapper for CRM HTML application
//

import SwiftUI
import WebKit

struct ContentView: View {
    @StateObject private var webViewStore = WebViewStore()
    
    var body: some View {
        ZStack {
            WebView(webView: webViewStore.webView)
                .ignoresSafeArea()
            
            if webViewStore.isLoading {
                ProgressView()
                    .scaleEffect(1.5)
                    .progressViewStyle(CircularProgressViewStyle(tint: .green))
            }
        }
    }
}

struct WebView: UIViewRepresentable {
    let webView: WKWebView
    
    func makeUIView(context: Context) -> WKWebView {
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

class WebViewStore: ObservableObject {
    @Published var webView: WKWebView
    @Published var isLoading: Bool = true
    
    init() {
        let configuration = WKWebViewConfiguration()
        configuration.preferences.javaScriptEnabled = true
        
        // Allow inline media playback
        configuration.allowsInlineMediaPlayback = true
        
        webView = WKWebView(frame: .zero, configuration: configuration)
        
        // Set navigation delegate
        webView.navigationDelegate = NavigationDelegate.shared
        
        // Load the local index.html file
        loadLocalHTML()
    }
    
    private func loadLocalHTML() {
        if let htmlPath = Bundle.main.path(forResource: "index", ofType: "html") {
            let htmlURL = URL(fileURLWithPath: htmlPath)
            let htmlDirectory = htmlURL.deletingLastPathComponent()
            webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlDirectory)
        } else {
            print("Error: index.html not found in app bundle")
        }
    }
}

class NavigationDelegate: NSObject, WKNavigationDelegate, ObservableObject {
    static let shared = NavigationDelegate()
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Page finished loading - loading indicator will be hidden by the view
        print("WebView finished loading")
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("WebView navigation failed: \(error.localizedDescription)")
    }
    
    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        // Show loading indicator
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
