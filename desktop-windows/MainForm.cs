using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace XerifeTV.Desktop;

/// <summary>
/// Carrega o build do Angular (pasta "app") numa origem http própria, com CORS desligado.
/// Assim o front busca catálogos e toca vídeos http:// direto do IP de quem assiste -
/// o mesmo que o Tauri faz (ver src-tauri/tauri.conf.json).
/// </summary>
internal sealed class MainForm : Form
{
    // Origem http (e não https): vídeo http://IP/...mp4 não vira mixed content.
    // Tem que ser *.localhost: o navegador trata como origem segura e aceita os cookies
    // "Secure" onde o auth.service.ts guarda o token (em outro host http o login se perde).
    private const string AppOrigin = "http://xerifetv.localhost";

    // Menor tamanho em que o layout não quebra (mesmo do app do CMS)
    private static readonly Size LayoutMinimumSize = new(1800, 990);

    // Mesmas flags do Tauri: sem CORS, conteúdo http liberado e autoplay sem clique
    private const string BrowserArguments =
        "--disable-web-security --allow-running-insecure-content --autoplay-policy=no-user-gesture-required";

    // Marca lida pelo native-stream-resolver.ts pra resolver os vídeos no aparelho
    private const string DesktopFlagScript = "window.__XERIFETV_DESKTOP__ = true;";

    private static readonly Dictionary<string, string> ContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".html"] = "text/html; charset=utf-8",
        [".js"] = "text/javascript; charset=utf-8",
        [".mjs"] = "text/javascript; charset=utf-8",
        [".css"] = "text/css; charset=utf-8",
        [".json"] = "application/json; charset=utf-8",
        [".txt"] = "text/plain; charset=utf-8",
        [".ico"] = "image/x-icon",
        [".png"] = "image/png",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".gif"] = "image/gif",
        [".webp"] = "image/webp",
        [".svg"] = "image/svg+xml",
        [".woff"] = "font/woff",
        [".woff2"] = "font/woff2",
        [".ttf"] = "font/ttf"
    };

    private readonly string _appFolder = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "app"));
    private readonly WebView2 _webView = new() { Dock = DockStyle.Fill };
    private CoreWebView2Environment? _environment;
    private FormWindowState _windowStateBeforeFullScreen;

    public MainForm()
    {
        Text = "XerifeTV";
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.Black;

        // Limita à área útil da tela: em monitor menor que o mínimo, abre maximizado
        var workingArea = Screen.PrimaryScreen?.WorkingArea.Size ?? LayoutMinimumSize;
        MinimumSize = new Size(
            Math.Min(LayoutMinimumSize.Width, workingArea.Width),
            Math.Min(LayoutMinimumSize.Height, workingArea.Height));
        Size = MinimumSize;
        if (MinimumSize != LayoutMinimumSize)
            WindowState = FormWindowState.Maximized;

        Controls.Add(_webView);
    }

    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);

        try
        {
            if (!File.Exists(Path.Combine(_appFolder, "index.html")))
                throw new FileNotFoundException(
                    $"Build do app não encontrado em \"{_appFolder}\". Gere o app com o publish-desktop.ps1.");

            await InitializeWebViewAsync();
        }
        catch (WebView2RuntimeNotFoundException)
        {
            ShowFatalError("O WebView2 Runtime não está instalado.\n\n" +
                "Baixe em: https://developer.microsoft.com/microsoft-edge/webview2/");
        }
        catch (Exception ex)
        {
            ShowFatalError(ex.Message);
        }
    }

    private async Task InitializeWebViewAsync()
    {
        // Pasta fixa: mantém login, progresso e preferências entre execuções
        var userDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "XerifeTV", "WebView2");
        _environment = await CoreWebView2Environment.CreateAsync(
            browserExecutableFolder: null,
            userDataFolder: userDataFolder,
            options: new CoreWebView2EnvironmentOptions(BrowserArguments));
        await _webView.EnsureCoreWebView2Async(_environment);

        var core = _webView.CoreWebView2;
        core.Settings.IsPasswordAutosaveEnabled = true;
        core.Settings.IsGeneralAutofillEnabled = true;
        await core.AddScriptToExecuteOnDocumentCreatedAsync(DesktopFlagScript);

        core.AddWebResourceRequestedFilter($"{AppOrigin}/*", CoreWebView2WebResourceContext.All);
        core.WebResourceRequested += OnWebResourceRequested;
        core.NewWindowRequested += OnNewWindowRequested;
        core.ContainsFullScreenElementChanged += (_, _) => SetFullScreen(core.ContainsFullScreenElement);
        core.DocumentTitleChanged += (_, _) =>
            Text = string.IsNullOrWhiteSpace(core.DocumentTitle) ? "XerifeTV" : core.DocumentTitle;

        core.Navigate($"{AppOrigin}/");
    }

    // Serve os arquivos do build. Rota do Angular (sem extensão, ex: /watch/123) recebe o
    // index.html - o roteador do Angular resolve no cliente, inclusive ao dar F5.
    private void OnWebResourceRequested(object? sender, CoreWebView2WebResourceRequestedEventArgs e)
    {
        var requestPath = Uri.UnescapeDataString(new Uri(e.Request.Uri).AbsolutePath).TrimStart('/');
        var filePath = Path.GetFullPath(Path.Combine(_appFolder, requestPath));
        var isInsideAppFolder = filePath.StartsWith(_appFolder + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase);

        if (!isInsideAppFolder || !File.Exists(filePath))
        {
            if (!string.IsNullOrEmpty(Path.GetExtension(requestPath)))
            {
                e.Response = _environment!.CreateWebResourceResponse(null, 404, "Not Found", string.Empty);
                return;
            }
            filePath = Path.Combine(_appFolder, "index.html");
        }

        var contentType = ContentTypes.GetValueOrDefault(Path.GetExtension(filePath), "application/octet-stream");
        // O WebView2 lê e libera o stream depois de montar a resposta
        e.Response = _environment!.CreateWebResourceResponse(
            File.OpenRead(filePath), 200, "OK", $"Content-Type: {contentType}");
    }

    // Links externos (target=_blank) abrem no navegador padrão
    private void OnNewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var uri) || e.Uri.StartsWith(AppOrigin, StringComparison.OrdinalIgnoreCase))
            return;

        e.Handled = true;
        Process.Start(new ProcessStartInfo(uri.ToString()) { UseShellExecute = true });
    }

    // Tela cheia do player (requestFullscreen) ocupa o monitor inteiro, sem borda
    private void SetFullScreen(bool isFullScreen)
    {
        if (isFullScreen)
        {
            _windowStateBeforeFullScreen = WindowState;
            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Normal;
            WindowState = FormWindowState.Maximized;
            return;
        }

        FormBorderStyle = FormBorderStyle.Sizable;
        WindowState = _windowStateBeforeFullScreen;
    }

    private void ShowFatalError(string message)
    {
        MessageBox.Show(this, message, "XerifeTV", MessageBoxButtons.OK, MessageBoxIcon.Error);
        Close();
    }
}
