import * as d3 from "d3";
import { CreateJson } from "./transformData/CreateJson";
import { InterfaceTM } from "./interfaces/dataTm.interface";
import { InterfaceSITP } from "./interfaces/dataSITP.interface";
import { LinksInterface } from "./interfaces/links.interfaces";

// 1️⃣ Crear nodos procesados desde CreateJson
const nodesTM: InterfaceTM[] = CreateJson.dataToJsonTM();
const nodesSITP: InterfaceSITP[] = CreateJson.dataToJsonSITP();


const linksTM: LinksInterface[] = CreateJson.linksdataJsonTM();
const linksSITP: LinksInterface[] = CreateJson.linksdataJsonSITP();

console.log(linksTM);
console.log(linksSITP);

// console.log("SITP:", nodesSITP);

// 2️⃣ Configurar SVG
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#app")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("background", "#f7f7f7");

// 3️⃣ Crear proyección centrada en Bogotá
const projection = d3.geoMercator()
  .center([-74.1, 4.65])
  .scale(300000) // puedes subir o bajar esto según el zoom
  .translate([width / 2, height / 2]);

// 4️⃣ Tooltip simple
const tooltip = d3.select("body")
  .append("div")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("background", "rgba(0,0,0,0.7)")
  .style("color", "#fff")
  .style("padding", "4px 8px")
  .style("border-radius", "4px")
  .style("font-size", "12px");

drawNodes(nodesTM, "tm", "#d62728");
drawLinks(linksTM, nodesTM);
drawNodes(nodesSITP, "sitp", "#1f77b4");
drawLinks(linksSITP, nodesSITP);


function drawNodes(data: InterfaceTM[], className: string, color: string) {
  svg.selectAll(`circle.${className}`)
    .data(data)
    .enter()
    .append("circle")
    .attr("class", className)
    .attr("cx", d => projection(d.coords)![0])
    .attr("cy", d => projection(d.coords)![1])
    .attr("r", 5)
    .attr("fill", color)
    .attr("opacity", 0.8)
    .on("mouseover", function (_event, d) {
      d3.select(this).transition().attr("r", 9);
      tooltip.style("visibility", "visible").text(d.name);
    })
    .on("mousemove", function (event) {
      tooltip.style("top", `${event.pageY - 20}px`)
             .style("left", `${event.pageX + 10}px`);
    })
    .on("mouseout", function () {
      d3.select(this).transition().attr("r", 5);
      tooltip.style("visibility", "hidden");
    });
}


function drawLinks(links: LinksInterface[], nodes: InterfaceTM[]) {
  // 🔍 Creamos un mapa rápido para buscar coordenadas por id
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Dibujamos una línea por cada enlace
  svg.selectAll("line.link")
    .data(links)
    .enter()
    .append("line")
    .attr("class", "link")
    .attr("x1", d => projection(nodeMap.get(d.source)!.coords)![0])
    .attr("y1", d => projection(nodeMap.get(d.source)!.coords)![1])
    .attr("x2", d => projection(nodeMap.get(d.target)!.coords)![0])
    .attr("y2", d => projection(nodeMap.get(d.target)!.coords)![1])
    .attr("stroke", "#999")
    .attr("stroke-width", 2)
    .attr("opacity", 0.7);
}
