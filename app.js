import * as THREE from "three";

const status = document.querySelector("#slideStatus");
const dotsContainer = document.querySelector("#slideDots");
const prevButton = document.querySelector("#prevSlide");
const nextButton = document.querySelector("#nextSlide");
const fallbackSlides = [
  "slides/01-bank-details.html",
  "slides/02-prayer-meetings.html",
  "slides/03-church-name.html"
];

let activeSlide = 0;
let slideModels = [];
let carousel = null;

async function discoverSlideFiles() {
  try {
    const response = await fetch("slides/");
    if (!response.ok) {
      throw new Error("Directory listing unavailable");
    }

    const html = await response.text();
    const documentFragment = new DOMParser().parseFromString(html, "text/html");
    const files = [...documentFragment.querySelectorAll("a")]
      .map((link) => link.getAttribute("href"))
      .filter((href) => href && href.endsWith(".html"))
      .map((href) => new URL(href, new URL("slides/", window.location.href)).pathname.split("/").pop())
      .filter((file, index, allFiles) => allFiles.indexOf(file) === index)
      .sort()
      .map((file) => `slides/${file}`);

    return files.length ? files : fallbackSlides;
  } catch {
    return fallbackSlides;
  }
}

async function loadSlideModels() {
  const files = await discoverSlideFiles();
  const fragments = await Promise.all(
    files.map(async (file) => {
      const response = await fetch(file);
      if (!response.ok) {
        throw new Error(`Could not load ${file}`);
      }
      return response.text();
    })
  );

  return fragments.map((fragment, index) => parseSlide(fragment, index));
}

function parseSlide(fragment, index) {
  const doc = new DOMParser().parseFromString(fragment, "text/html");
  const eyebrow = doc.querySelector(".eyebrow")?.textContent.trim() || "";
  const headingNode = doc.querySelector("h1, h2");
  const heading = headingNode?.textContent.trim() || `Slide ${index + 1}`;
  const body = [...doc.querySelectorAll("p:not(.eyebrow), .time-pill")]
    .map((node) => node.textContent.trim())
    .filter(Boolean);
  const table = [...doc.querySelectorAll(".bank-row")]
    .map((row) => [...row.querySelectorAll(".bank-cell")]
      .map((cell) => cell.textContent.trim()));

  return {
    eyebrow,
    heading,
    body,
    table,
    hero: headingNode?.tagName === "H1" && !body.length && !table.length,
    label: [eyebrow, heading, ...body].filter(Boolean).join(" - ")
  };
}

function makeSlideTexture(slide) {
  const canvas = document.createElement("canvas");
  const width = 1800;
  const height = 1050;
  const ctx = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  drawPanelBackground(ctx, width, height);

  if (slide.hero) {
    drawWrappedText(ctx, slide.heading, 135, 415, 1320, 150, 0.95, "#067a72", 900);
    drawAccent(ctx, 135, 720);
    return makeTexture(canvas);
  }

  if (slide.eyebrow) {
    ctx.fillStyle = "#067a72";
    ctx.font = "700 46px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(slide.eyebrow.toUpperCase(), 135, 160);
  }

  drawWrappedText(ctx, slide.heading, 135, slide.eyebrow ? 285 : 245, 1250, 118, 0.95, "#182026", 900);

  if (slide.table.length) {
    drawBankTable(ctx, slide.table, 135, 470, 1530);
  } else {
    let y = slide.heading.length > 28 ? 520 : 470;
    slide.body.forEach((line, index) => {
      if (index === 0 && line.toLowerCase().includes("8pm")) {
        drawPill(ctx, line, 135, y);
        y += 168;
        return;
      }
      y = drawWrappedText(ctx, line, 135, y, 1040, 46, 1.42, "#5d686f", 650) + 34;
    });
    drawAccent(ctx, 135, Math.min(y + 30, 895));
  }

  return makeTexture(canvas);
}

function makeTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawPanelBackground(ctx, width, height) {
  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "#fffdf7");
  base.addColorStop(0.5, "#f3f4ed");
  base.addColorStop(1, "#f4ead5");
  ctx.fillStyle = base;
  roundRect(ctx, 0, 0, width, height, 44);
  ctx.fill();

  const wash = ctx.createRadialGradient(250, 160, 20, 250, 160, 820);
  wash.addColorStop(0, "rgba(6, 122, 114, 0.22)");
  wash.addColorStop(1, "rgba(6, 122, 114, 0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
}

function drawWrappedText(ctx, text, x, y, maxWidth, size, lineHeight, color, weight) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += size * lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line) {
    ctx.fillText(line, x, cursorY);
  }
  return cursorY + size * lineHeight;
}

function drawBankTable(ctx, rows, x, y, width) {
  const columns = [0.29, 0.33, 0.38];
  const rowHeight = 118;
  let cursorY = y;

  rows.forEach((row, rowIndex) => {
    const isHeader = rowIndex === 0;
    ctx.fillStyle = isHeader ? "#2f7d73" : "rgba(255, 255, 255, 0.82)";
    roundRect(ctx, x, cursorY, width, rowHeight, rowIndex === 0 ? 18 : 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(24, 32, 38, 0.13)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, cursorY, width, rowHeight);

    let cursorX = x;
    row.forEach((cell, columnIndex) => {
      const cellWidth = width * columns[columnIndex];
      ctx.fillStyle = isHeader ? "#ffffff" : "#182026";
      ctx.font = `${isHeader ? 800 : 650} ${isHeader ? 34 : 43}px system-ui, -apple-system, Segoe UI, sans-serif`;
      ctx.fillText(isHeader ? cell.toUpperCase() : cell, cursorX + 44, cursorY + 74);
      if (columnIndex > 0) {
        ctx.strokeStyle = "rgba(24, 32, 38, 0.13)";
        ctx.beginPath();
        ctx.moveTo(cursorX, cursorY);
        ctx.lineTo(cursorX, cursorY + rowHeight);
        ctx.stroke();
      }
      cursorX += cellWidth;
    });
    cursorY += rowHeight;
  });
}

function drawPill(ctx, text, x, y) {
  ctx.font = "800 46px system-ui, -apple-system, Segoe UI, sans-serif";
  const width = ctx.measureText(text).width + 86;
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.strokeStyle = "rgba(6, 122, 114, 0.22)";
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, width, 92, 46);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#067a72";
  ctx.fillText(text, x + 43, y + 61);
}

function drawAccent(ctx, x, y) {
  const gradient = ctx.createLinearGradient(x, y, x + 350, y);
  gradient.addColorStop(0, "#067a72");
  gradient.addColorStop(1, "#d99b27");
  ctx.fillStyle = gradient;
  roundRect(ctx, x, y, 350, 13, 7);
  ctx.fill();
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function startThreeScene(models) {
  const canvas = document.querySelector("#scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const world = new THREE.Group();
  const panelGroup = new THREE.Group();
  const particles = new THREE.Group();
  const clock = new THREE.Clock();

  camera.position.set(0, 0.15, 11);
  world.add(panelGroup, particles);
  scene.add(world);

  models.forEach((model, index) => {
    const texture = makeSlideTexture(model);
    const geometry = new THREE.PlaneGeometry(8.75, 5.1, 20, 12);
    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      roughness: 0.45,
      metalness: 0.04,
      clearcoat: 0.45,
      clearcoatRoughness: 0.42,
      transparent: true,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.index = index;
    panelGroup.add(mesh);

    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 })
    );
    mesh.add(edge);
  });

  for (let i = 0; i < 70; i += 1) {
    const geometry = new THREE.IcosahedronGeometry(0.08 + Math.random() * 0.18, 1);
    const material = new THREE.MeshStandardMaterial({
      color: [0x067a72, 0xd99b27, 0x82a7a0, 0x2b5160][i % 4],
      roughness: 0.62,
      transparent: true,
      opacity: 0.62
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 9, -4 - Math.random() * 8);
    mesh.userData.speed = 0.25 + Math.random() * 0.8;
    particles.add(mesh);
  }

  scene.add(new THREE.AmbientLight(0xffffff, 1.6));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(4, 7, 6);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0xd99b27, 25, 18);
  rimLight.position.set(-5, -3, 4);
  scene.add(rimLight);

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 720 ? 13.5 : 11;
    camera.updateProjectionMatrix();
  }

  function animate() {
    const elapsed = clock.getElapsedTime();
    panelGroup.children.forEach((mesh) => {
      const offset = shortestOffset(mesh.userData.index, activeSlide, models.length);
      const targetX = offset * 6.4;
      const targetZ = Math.abs(offset) * -1.8;
      const targetRotation = offset * -0.52;
      const active = offset === 0;

      mesh.position.x += (targetX - mesh.position.x) * 0.08;
      mesh.position.y += ((active ? 0.12 : -0.05) - mesh.position.y) * 0.08;
      mesh.position.z += (targetZ - mesh.position.z) * 0.08;
      mesh.rotation.y += (targetRotation - mesh.rotation.y) * 0.08;
      mesh.rotation.x = Math.sin(elapsed * 0.7 + mesh.userData.index) * 0.025;
      mesh.material.opacity = active || Math.abs(offset) < 2 ? 1 : 0.18;
      mesh.visible = Math.abs(offset) < 3;
    });

    particles.children.forEach((mesh) => {
      mesh.rotation.x += 0.006 * mesh.userData.speed;
      mesh.rotation.y += 0.004 * mesh.userData.speed;
      mesh.position.y += Math.sin(elapsed * mesh.userData.speed + mesh.position.x) * 0.0018;
    });
    world.rotation.y = Math.sin(elapsed * 0.15) * 0.035;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  resize();
  window.addEventListener("resize", resize);
  animate();
  return { renderer, scene, camera };
}

function shortestOffset(index, active, total) {
  let offset = index - active;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}

function setActiveSlide(index) {
  if (!slideModels.length) return;
  activeSlide = (index + slideModels.length) % slideModels.length;
  dotsContainer.querySelectorAll(".slide-dot").forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === activeSlide);
    dot.setAttribute("aria-current", dotIndex === activeSlide ? "true" : "false");
  });
  status.textContent = slideModels[activeSlide].label;
}

function renderDots(total) {
  dotsContainer.innerHTML = Array.from({ length: total }, (_, index) => {
    const label = `Show slide ${index + 1}`;
    return `<button class="slide-dot" type="button" aria-label="${label}" data-slide-target="${index}"></button>`;
  }).join("");
}

prevButton.addEventListener("click", () => setActiveSlide(activeSlide - 1));
nextButton.addEventListener("click", () => setActiveSlide(activeSlide + 1));
dotsContainer.addEventListener("click", (event) => {
  const target = event.target.closest("[data-slide-target]");
  if (target) {
    setActiveSlide(Number(target.dataset.slideTarget));
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    setActiveSlide(activeSlide - 1);
  }
  if (event.key === "ArrowRight") {
    setActiveSlide(activeSlide + 1);
  }
});

loadSlideModels()
  .then((models) => {
    slideModels = models;
    renderDots(models.length);
    carousel = startThreeScene(models);
    setActiveSlide(0);
  })
  .catch((error) => {
    status.innerHTML = `<div class="load-error"><h2>Slides could not load</h2><p>${error.message}</p></div>`;
  });
