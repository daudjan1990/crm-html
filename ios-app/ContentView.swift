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
    @StateObject private var navigationDelegate = NavigationDelegate()
    
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
        .onAppear {
            navigationDelegate.webViewStore = webViewStore
            webViewStore.webView.navigationDelegate = navigationDelegate
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
            isLoading = false
        }
    }
    
    func setLoading(_ loading: Bool) {
        DispatchQueue.main.async {
            self.isLoading = loading
        }
    }
}

class NavigationDelegate: NSObject, WKNavigationDelegate, ObservableObject {
    weak var webViewStore: WebViewStore?
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Page finished loading
        webViewStore?.setLoading(false)
        print("WebView finished loading")
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        webViewStore?.setLoading(false)
        print("WebView navigation failed: \(error.localizedDescription)")
    }
    
    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        // Navigation started
        webViewStore?.setLoading(true)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
