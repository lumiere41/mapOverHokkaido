(async function(){
  const svg       = d3.select("#stage");
  const gViewport = svg.append("g");                         
  const gBase     = gViewport.append("g").attr("id","hokkaido"); 
  const gPref     = gViewport.append("g").attr("id","pref");    

  const W=900, H=650, PAD=20;

  // ---- 都道府県リスト（地方ごと） ----
  const PREFS = {
    Hokkaido: ["Hokkaido"],
    Touhoku: ["Aomori","Iwate","Miyagi","Akita","Yamagata","Fukushima"],
    Kanto: ["Ibaraki","Tochigi","Gunma","Saitama","Chiba","Tokyo","Kanagawa"],
    Chubu: ["Niigata","Toyama","Ishikawa","Fukui","Yamanashi","Nagano","Gifu","Shizuoka","Aichi"],
    Kinki: ["Mie","Shiga","Kyoto","Osaka","Hyogo","Nara","Wakayama"],
    Chugoku: ["Tottori","Shimane","Okayama","Hiroshima","Yamaguchi"],
    Shikoku: ["Tokushima","Kagawa","Ehime","Kochi"],
    Kyushu: ["Fukuoka","Saga","Nagasaki","Kumamoto","Oita","Miyazaki","Kagoshima"],
    Okinawa: ["Okinawa"]
  };

  // 日本語表記マップ
  const PREFS_JA = {
    Hokkaido: "北海道",
    Aomori: "青森県", Iwate: "岩手県", Miyagi: "宮城県", Akita: "秋田県", Yamagata: "山形県", Fukushima: "福島県",
    Ibaraki: "茨城県", Tochigi: "栃木県", Gunma: "群馬県", Saitama: "埼玉県", Chiba: "千葉県", Tokyo: "東京都", Kanagawa: "神奈川県",
    Niigata: "新潟県", Toyama: "富山県", Ishikawa: "石川県", Fukui: "福井県", Yamanashi: "山梨県", Nagano: "長野県",
    Gifu: "岐阜県", Shizuoka: "静岡県", Aichi: "愛知県",
    Mie: "三重県", Shiga: "滋賀県", Kyoto: "京都府", Osaka: "大阪府", Hyogo: "兵庫県", Nara: "奈良県", Wakayama: "和歌山県",
    Tottori: "鳥取県", Shimane: "島根県", Okayama: "岡山県", Hiroshima: "広島県", Yamaguchi: "山口県",
    Tokushima: "徳島県", Kagawa: "香川県", Ehime: "愛媛県", Kochi: "高知県",
    Fukuoka: "福岡県", Saga: "佐賀県", Nagasaki: "長崎県", Kumamoto: "熊本県", Oita: "大分県",
    Miyazaki: "宮崎県", Kagoshima: "鹿児島県", Okinawa: "沖縄県"
  };

  // ---- セレクトボックス自動生成 ----
  const select = document.getElementById("prefSelect");
  for (const [region, prefs] of Object.entries(PREFS)) {
    const group = document.createElement("optgroup");
    group.label = region;
    prefs.forEach(pref => {
      const option = document.createElement("option");
      option.value = pref;
      option.textContent = PREFS_JA[pref] || pref;
      group.appendChild(option);
    });
    select.appendChild(group);
  }

  // ---- データロード関数 ----
  async function loadGeoJSON(path){
    try{
      const res = await fetch(path);
      if(!res.ok) throw new Error("HTTP "+res.status);
      return await res.json();
    }catch(e){
      showErr("GeoJSON取得失敗: "+e.message);
      return null;
    }
  }

  // ---- 北海道データ読み込み ----
  const hk = await loadGeoJSON("./geojsons/Hokkaido/Hokkaido.geojson");
  if(!hk) return;

  // 投影を北海道基準で設定
  const proj = d3.geoMercator().fitExtent([[PAD,PAD],[W-PAD,H-PAD]], hk);
  const path = d3.geoPath(proj);

  // 北海道を描画
  gBase.append("path")
      .datum(hk.features[0])
      .attr("d", path)
      .attr("fill", "#bfe3bf")
      .attr("stroke", "#6a8c6a");

  // ---- 選択県を描画する関数 ----
  async function drawPrefecture(region, name){
    const data = await loadGeoJSON(`./geojsons/${region}/${name}.geojson`);
    if(!data) return;

    // 一旦消去
    gPref.selectAll("*").remove();

    // 県のパス
    gPref.append("path")
      .datum(data.features[0])
      .attr("d", path)
      .attr("fill", "rgba(255,60,60,.55)")
      .attr("stroke", "rgba(120,0,0,.9)")
      .attr("stroke-width", 1.2);

    // 外接矩形
    const [[x0,y0],[x1,y1]] = path.bounds(data.features[0]);
    gPref.append("rect")
      .attr("x", x0)
      .attr("y", y0)
      .attr("width",  x1-x0)
      .attr("height", y1-y0)
      .attr("fill", "none")
      .attr("stroke", "blue")
      .attr("stroke-dasharray", "4 2")
      .attr("pointer-events","none");

    // 北海道の中心に移動
    const [cx, cy] = path.centroid(hk.features[0]); 
    const tx = cx - x0;
    const ty = cy - y0;
    gPref.attr("transform", `translate(${tx},${ty})`)
         .style("cursor","move");

    // ドラッグ可能
    let dx = tx, dy = ty;
    gPref.call(
      d3.drag()
        .on("start", (ev)=> { if(ev.sourceEvent) ev.sourceEvent.stopPropagation(); })
        .on("drag",  (ev)=> {
          const k = d3.zoomTransform(svg.node()).k;
          dx += ev.dx / k;
          dy += ev.dy / k;
          gPref.attr("transform", `translate(${dx},${dy})`);
        })
    );
  }

  // ---- ズーム/パン ----
  const zoom = d3.zoom()
    .scaleExtent([0.5, 8])
    .on("zoom", (ev)=> { gViewport.attr("transform", ev.transform); });
  svg.call(zoom);

  // ---- ドロップダウン変更イベント ----
  select.addEventListener("change", (e) => {
    const pref = e.target.value;
    let region = Object.keys(PREFS).find(r => PREFS[r].includes(pref));
    drawPrefecture(region, pref);
  });

  // 初期は Tokyo
  drawPrefecture("Kanto", "Tokyo");

  // ---- エラーメッセージ表示 ----
  function showErr(msg){
    const el = document.getElementById("err");
    if(!el) return;
    el.textContent = msg;
    el.style.display = "block";
  }
})();
