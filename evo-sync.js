/* EvoSync v1 - two-frontend bridge (Dashboard <-> Site)
   Works cross-domain using Supabase REST as a tiny KV store (no custom server).
   If EVO_SYNC_CONFIG is missing, it falls back to same-origin localStorage only. */
(function(){
  const DEFAULT_KEYS = ["evo_models_data","evo_feed_data","evo_project_data","evo_prof_data"];
  const cfg = (window.EVO_SYNC_CONFIG || null);

  const EvoSync = {
    _applying: false,
    _hooked: false,

    isConfigured(){
      return !!(cfg && cfg.supabaseUrl && cfg.anonKey);
    },

    _restBase(){
      return cfg.supabaseUrl.replace(/\/+$/,'') + "/rest/v1";
    },

    _headers(){
      return {
        "apikey": cfg.anonKey,
        "Authorization": "Bearer " + cfg.anonKey,
        "Content-Type": "application/json"
      };
    },

    async upsert(key, value){
      if(!this.isConfigured()) return;
      const url = this._restBase() + "/kv?on_conflict=key";
      const body = JSON.stringify([{ key, value, updated_at: new Date().toISOString() }]);
      const res = await fetch(url, {
        method: "POST",
        headers: { ...this._headers(), "Prefer": "resolution=merge-duplicates,return=minimal" },
        body
      });
      if(!res.ok){
        const txt = await res.text().catch(()=> "");
        throw new Error("Supabase upsert failed: " + res.status + " " + txt);
      }
    },

    async delRemote(key){
      if(!this.isConfigured()) return;
      const url = this._restBase() + "/kv?key=eq." + encodeURIComponent(key);
      const res = await fetch(url, { method:"DELETE", headers: this._headers() });
      if(!res.ok){
        const txt = await res.text().catch(()=> "");
        throw new Error("Supabase delete failed: " + res.status + " " + txt);
      }
    },

    async fetchMany(keys){
      if(!this.isConfigured()) return [];
      const list = (keys && keys.length ? keys : DEFAULT_KEYS).map(k => k.replace(/"/g,''));
      // Supabase: key=in.(a,b,c)
      const inPart = "in.(" + list.map(k => `"${k}"`).join(",") + ")";
      const url = this._restBase() + "/kv?select=key,value,updated_at&key=" + encodeURIComponent(inPart);
      const res = await fetch(url, { headers: this._headers() });
      if(!res.ok){
        const txt = await res.text().catch(()=> "");
        throw new Error("Supabase fetch failed: " + res.status + " " + txt);
      }
      return await res.json();
    },

    async applyRemoteToLocal(keys){
      if(!this.isConfigured()) return false;
      const rows = await this.fetchMany(keys);
      if(!rows || !rows.length) return false;

      this._applying = true;
      try{
        rows.forEach(r => {
          try{
            localStorage.setItem(r.key, JSON.stringify(r.value ?? null));
          }catch(_){}
        });
      } finally {
        this._applying = false;
      }
      return true;
    },

    hookLocalStorage(keys){
      if(this._hooked) return;
      const watch = new Set((keys && keys.length ? keys : DEFAULT_KEYS));

      const _set = localStorage.setItem.bind(localStorage);
      const _rm  = localStorage.removeItem.bind(localStorage);
      const _clr = localStorage.clear.bind(localStorage);

      localStorage.setItem = (k, v) => {
        _set(k, v);
        if(this._applying) return;
        if(!watch.has(k)) return;

        // push async (fire and forget)
        try{
          const parsed = JSON.parse(v);
          this.upsert(k, parsed).catch(()=>{});
        }catch(_){
          // if not json, store raw string as value
          this.upsert(k, String(v)).catch(()=>{});
        }
      };

      localStorage.removeItem = (k) => {
        _rm(k);
        if(this._applying) return;
        if(!watch.has(k)) return;
        this.delRemote(k).catch(()=>{});
      };

      localStorage.clear = () => {
        _clr();
        if(this._applying) return;
        // we won't mass-delete remote on clear (too risky). remote stays.
      };

      this._hooked = true;
    },

    startAutoPull(keys, opts){
      const intervalMs = (opts && opts.intervalMs) || 5000;
      const onPulled = (opts && opts.onPulled) || null;

      if(!this.isConfigured()) return;

      const doPull = async () => {
        try{
          const ok = await this.applyRemoteToLocal(keys);
          if(ok && typeof onPulled === "function") onPulled();
        }catch(_){}
      };

      // initial + periodic + on focus
      doPull();
      setInterval(doPull, intervalMs);
      window.addEventListener("focus", doPull);
      document.addEventListener("visibilitychange", () => {
        if(!document.hidden) doPull();
      });
    }
  };

  window.EvoSync = EvoSync;
})();