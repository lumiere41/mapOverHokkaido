(async function(){
  const svg       = d3.select("#stage");
  const gViewport = svg.append("g");
  const gBase     = gViewport.append("g").attr("id","hokkaido");
  const gPrefRoot = gViewport.append("g").attr("id","prefRoot");

  const W=900, H=650, PAD=20;

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

  const PREFS_JA = {
    Hokkaido:"北海道",
    Aomori:"青森県",Iwate:"岩手県",Miyagi:"宮城県",Akita:"秋田県",Yamagata:"山形県",Fukushima:"福島県",
    Ibaraki:"茨城県",Tochigi:"栃木県",Gunma:"群馬県",Saitama:"埼玉県",Chiba:"千葉県",Tokyo:"東京都",Kanagawa:"神奈川県",
    Niigata:"新潟県",Toyama:"富山県",Ishikawa:"石川県",Fukui:"福井県",Yamanashi:"山梨県",Nagano:"長野県",
    Gifu:"岐阜県",Shizuoka:"静岡県",Aichi:"愛知県",
    Mie:"三重県",Shiga:"滋賀県",Kyoto:"京都府",Osaka:"大阪府",Hyogo:"兵庫県",Nara:"奈良県",Wakayama:"和歌山県",
    Tottori:"鳥取県",Shimane:"島根県",Okayama:"岡山県",Hiroshima:"広島県",Yamaguchi:"山口県",
    Tokushima:"徳島県",Kagawa:"香川県",Ehime:"愛媛県",Kochi:"高知県",
    Fukuoka:"福岡県",Saga:"佐賀県",Nagasaki:"長崎県",Kumamoto:"熊本県",Oita:"大分県",
    Miyazaki:"宮崎県",Kagoshima:"鹿児島県",Okinawa:"沖縄県"
  };

  // セレクト自動生成
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

  async function loadGeoJSON(path){
    const res = await fetch(path);
    if(!res.ok) throw new Error("HTTP "+res.status);
    return await res.json();
  }

  // 北海道の描画
  const hk = await loadGeoJSON("./geojsons/Hokkaido/Hokkaido.geojson");
  const proj = d3.geoMercator().fitExtent([[PAD,PAD],[W-PAD,H-PAD]], hk);
  const path = d3.geoPath(proj);
  gBase.append("path")
      .datum(hk.features[0])
      .attr("d", path)
      .attr("fill", "#bfe3bf")
      .attr("stroke", "#6a8c6a");

  // 管理用
  let counter = 0;
  let activePrefectures = {}; // { id: { g, name, color, data } }
  let selectedId = null;

  function randomColor(){
    const h = Math.floor(Math.random()*360);
    return `hsl(${h},70%,60%)`;
  }

  async function addPrefecture(region, name){
    counter++;
    const id = `${name}_${counter}`;
    const data = await loadGeoJSON(`./geojsons/${region}/${name}.geojson`);
    const color = randomColor();

    const g = gPrefRoot.append("g").attr("class","pref").attr("data-id",id);

    g.append("path")
      .datum(data.features[0])
      .attr("d", path)
      .attr("fill", color)
      .attr("fill-opacity", 0.5)
      .attr("stroke", "black")
      .attr("stroke-width", 1);

    const [[x0,y0],[x1,y1]] = path.bounds(data.features[0]);
    g.append("rect")
      .attr("x", x0).attr("y", y0)
      .attr("width", x1-x0).attr("height", y1-y0)
      .attr("fill","none").attr("stroke","blue").attr("stroke-dasharray","4 2");

    const [cx, cy] = path.centroid(hk.features[0]);
    let dx = cx - x0, dy = cy - y0;
    g.attr("transform",`translate(${dx},${dy})`).style("cursor","move");

    g.call(d3.drag().on("drag",(ev)=>{
      const k = d3.zoomTransform(svg.node()).k;
      dx += ev.dx / k;
      dy += ev.dy / k;
      g.attr("transform",`translate(${dx},${dy})`);
    }));

    activePrefectures[id] = { g, name, color, data: data.features[0] };
    addToList(id, name, color);
  }

  function removePrefecture(id){
    if(!activePrefectures[id]) return;
    activePrefectures[id].g.remove();
    delete activePrefectures[id];
    document.querySelector(`#addedList li[data-id='${id}']`).remove();
    if(selectedId === id) selectedId = null;
  }

  function clearAllPrefectures(){
    gPrefRoot.selectAll("*").remove();
    document.getElementById("addedList").innerHTML = "";
    activePrefectures = {};
    selectedId = null;
  }

  function clearSelection(){
    selectedId = null;
    document.querySelectorAll("#addedList li").forEach(li=>{
      li.classList.remove("selected");
    });
    Object.values(activePrefectures).forEach(obj=>{
      obj.g.select("path").attr("stroke-width", 1);
    });
  }

  function focusPrefecture(id){
    if(!activePrefectures[id]) return;

    if(selectedId === id){
      clearSelection();
      return;
    }

    selectedId = id;
    document.querySelectorAll("#addedList li").forEach(li=>{
      li.classList.toggle("selected", li.dataset.id===id);
    });

    const { g, data } = activePrefectures[id];
    g.raise();

    Object.entries(activePrefectures).forEach(([pid,obj])=>{
      obj.g.select("path").attr("stroke-width", pid===id ? 4 : 1);
    });

    const [[x0,y0]] = path.bounds(data);
    const [cx, cy] = path.centroid(hk.features[0]);
    const dx = cx - x0;
    const dy = cy - y0;
    g.attr("transform", `translate(${dx},${dy})`);
  }

  function addToList(id, name, color){
    const ul = document.getElementById("addedList");
    const li = document.createElement("li");
    li.setAttribute("data-id", id);
    li.textContent = PREFS_JA[name] || name;
    li.style.color = color;

    li.onclick = ()=> focusPrefecture(id);

    const btn = document.createElement("button");
    btn.textContent = "削除";
    btn.className = "removeBtn";
    btn.onclick = (ev)=> {
      ev.stopPropagation();
      removePrefecture(id);
    };

    li.appendChild(btn);
    ul.appendChild(li);
  }

  const zoom = d3.zoom().scaleExtent([0.5,8])
    .on("zoom",ev=> gViewport.attr("transform", ev.transform));
  svg.call(zoom);

  document.getElementById("addBtn").addEventListener("click", ()=>{
    const pref = select.value;
    const region = Object.keys(PREFS).find(r=>PREFS[r].includes(pref));
    addPrefecture(region, pref);
  });

  document.getElementById("clearBtn").addEventListener("click", ()=>{
    clearAllPrefectures();
  });

  // SVGの空白クリックで解除（北海道含む）
  svg.on("click", (ev)=>{
    const isPref = ev.target.closest("g.pref");
    if(!isPref){
      clearSelection();
    }
  });

})();
