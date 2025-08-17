(async function(){
  const URL = "https://cdn.jsdelivr.net/gh/dataofjapan/land@master/japan.geojson";

  const svg       = d3.select("#stage");
  const gViewport = svg.append("g");                         // ズーム/パン対象（全体）
  const gBase     = gViewport.append("g").attr("id","hokkaido"); // 北海道（背景固定）
  const gTokyo    = gViewport.append("g").attr("id","tokyo");    // 東京都（上・ドラッグ可）

  const W=900, H=650, PAD=20;

  // ---- データ取得 ----
  let geo;
  try{
    const res = await fetch(URL, {mode:"cors"});
    if(!res.ok) throw new Error("HTTP "+res.status);
    geo = await res.json();
  }catch(e){
    return showErr("GeoJSON取得失敗: "+e.message+"（ネット/プロキシ/CORSを確認）");
  }

  // ---- 北海道 & 東京都 抽出（nam_ja が正）----
  const nameOf = f => (f.properties?.nam_ja || "");
  const feats  = geo.features || [];
  const hk     = feats.find(f => nameOf(f)==="北海道");
  const tk     = feats.find(f => nameOf(f)==="東京都");
  if(!hk) return showErr("『北海道』が見つかりません。");
  if(!tk) return showErr("『東京都』が見つかりません。");

  // ---- 投影：北海道で fit → 同一投影で東京都も描画（比率維持）----
  const proj = d3.geoMercator().fitExtent([[PAD,PAD],[W-PAD,H-PAD]], hk);
  const path = d3.geoPath(proj);

  // ---- 北海道（背景）----
  gBase.append("path")
      .datum(hk)
      .attr("d", path)
      .attr("fill", "#bfe3bf")
      .attr("stroke", "#6a8c6a");

  // ---- 東京都（パス）----
  gTokyo.append("path")
      .datum(tk)
      .attr("d", path)
      .attr("fill", "rgba(255,60,60,.55)")
      .attr("stroke", "rgba(120,0,0,.9)")
      .attr("stroke-width", 1.2);

  // ---- 東京都の外接矩形（パウンディングボックス）----
  const [[x0,y0],[x1,y1]] = path.bounds(tk);
  const bbox = { x:x0, y:y0, w:x1-x0, h:y1-y0 };

  gTokyo.append("rect")
      .attr("x", bbox.x)
      .attr("y", bbox.y)
      .attr("width",  bbox.w)
      .attr("height", bbox.h)
      .attr("fill", "none")
      .attr("stroke", "blue")
      .attr("stroke-dasharray", "4 2")
      .attr("pointer-events","none"); // 矩形は操作対象外

  // ---- 初期配置：東京都の矩形左上を北海道中心へ ----
  const [cx, cy] = path.centroid(hk); // 富良野あたりの中心代表
  let tx = cx - bbox.x;
  let ty = cy - bbox.y;
  gTokyo.attr("transform", `translate(${tx},${ty})`)
        .style("cursor","move");

  // ---- ズーム/パン（全体。北海道・東京都とも同倍率で拡縮）----
  const zoom = d3.zoom()
    .scaleExtent([0.5, 8])
    .on("zoom", (ev)=> { gViewport.attr("transform", ev.transform); });
  svg.call(zoom); // マウス:ドラッグ=パン/ホイール=ズーム、タッチ:ピンチ可

  // ---- 東京都ドラッグ（ズームと共存。移動量はkで割る）----
  gTokyo.call(
    d3.drag()
      .on("start", (ev)=> { if(ev.sourceEvent) ev.sourceEvent.stopPropagation(); })
      .on("drag",  (ev)=> {
        const k = d3.zoomTransform(svg.node()).k;
        tx += ev.dx / k;
        ty += ev.dy / k;
        gTokyo.attr("transform", `translate(${tx},${ty})`);
      })
  );

  function showErr(msg){
    const el = document.getElementById("err");
    if(!el) return;
    el.textContent = msg;
    el.style.display = "block";
  }
})();

fetch("./geojsons/Kanto/Tokyo.geojson")
  .then(res => res.json())
  .then(data => console.log("Tokyoデータ:", data));
