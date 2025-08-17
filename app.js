(async function(){
  const URL = "https://cdn.jsdelivr.net/gh/dataofjapan/land@master/japan.geojson";
  const svg = d3.select("#stage"), g = svg.append("g");
  const W = 900, H = 650, PAD = 20;

  let geo;
  try {
    const res = await fetch(URL, { mode: "cors" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    geo = await res.json();
  } catch (e) {
    showErr("GeoJSONの取得に失敗: " + e.message + "（ネット/プロキシ/CORSを確認）");
    return;
  }

  const nameOf = f => (f.properties?.nam_ja || f.properties?.name_ja || f.properties?.NAME_JA || f.properties?.pref || f.properties?.name || "");
  const hk = (geo.features || []).find(f => /北海道/.test(nameOf(f)));
  if (!hk) { showErr("GeoJSON内に『北海道』が見つかりませんでした。"); return; }

  const proj = d3.geoMercator();
  proj.fitExtent([[PAD, PAD], [W - PAD, H - PAD]], hk);
  const path = d3.geoPath(proj);

  g.append("path")
    .datum(hk)
    .attr("d", path)
    .attr("fill", "#bfe3bf")
    .attr("stroke", "#6a8c6a");

  function showErr(msg){
    const el = document.getElementById("err");
    el.textContent = msg;
    el.style.display = "block";
  }
})();
