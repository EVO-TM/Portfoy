// evo-sync-config.js
// Bu dosyayı iki siteye de aynı şekilde koyacaksın.
// Supabase bilgilerini buraya yapıştırınca Dashboard'da yaptığın değişiklikler otomatik Site'ye düşer.
//
// 1) Supabase -> Project Settings -> API -> Project URL
// 2) Supabase -> Project Settings -> API -> anon public key
//
// Not: Bu dosyada sadece anon key var (public). Service role key KULLANMA.
window.EVO_SYNC_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_PUBLIC_KEY"
};