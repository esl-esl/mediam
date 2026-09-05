import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HSE Study Space",
    template: "%s · HSE Study Space",
  },
  description: "Учебный планер для дедлайнов, оценок, материалов, диплома и университетских активностей.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111a2b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var m=localStorage.getItem('study-space-theme')||'system';
                var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.classList.toggle('dark',d);
                document.documentElement.dataset.theme=d?'dark':'light';
                document.documentElement.style.colorScheme=d?'dark':'light';
              } catch(e) {}

              // Safari can restore an old document from the back/forward cache
              // after a new deployment. Force a real request in that case.
              addEventListener('pageshow',function(e){
                if(e.persisted) location.reload();
              });

              // If an old document references a chunk that no longer exists,
              // recover once instead of leaving a blank React root.
              var recoveryKey='study-space-stale-build-recovery';
              function recoverOnce(){
                try {
                  if(sessionStorage.getItem(recoveryKey)==='1') return;
                  sessionStorage.setItem(recoveryKey,'1');
                } catch(e) {}
                location.reload();
              }

              addEventListener('error',function(e){
                var t=e.target;
                if(t&&(t.tagName==='SCRIPT'||(t.tagName==='LINK'&&/^(stylesheet|modulepreload|preload)$/.test(t.rel||'')))) recoverOnce();
              },true);

              addEventListener('unhandledrejection',function(e){
                var r=e.reason;
                var message=String((r&&r.message)||r||'');
                if(/ChunkLoadError|CSS_CHUNK_LOAD_FAILED|Failed to fetch dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(message)) recoverOnce();
              });

              addEventListener('load',function(){
                setTimeout(function(){
                  try { sessionStorage.removeItem(recoveryKey); } catch(e) {}
                },3000);
              },{once:true});
            })()`,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
