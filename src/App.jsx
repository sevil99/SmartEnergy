import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, OrbitControls, useBounds, useGLTF } from '@react-three/drei'
import { Color, DoubleSide, MeshStandardMaterial } from 'three'
import engineData from './data/engine.json'

const MODEL_URL = '/Engine.glb'
const DATA_BY_NODE = new Map(engineData.parts.map((part) => [part.node, part]))

function PartModel({ selectedId, hoveredId, onSelect, onHover, onLoaded }) {
  const { scene } = useGLTF(MODEL_URL)
  const parts = useMemo(() => {
    const found = []
    scene.traverse((object) => {
      if (!object.isMesh) return
      const id = `part-${found.length + 1}`
      const sourceName = object.name || `mesh_${found.length + 1}`
      const info = DATA_BY_NODE.get(sourceName)
      const geometry = object.geometry
      const triangles = geometry.index
        ? Math.floor(geometry.index.count / 3)
        : Math.floor((geometry.attributes.position?.count || 0) / 3)

      object.userData.partId = id
      object.material = new MeshStandardMaterial({
        color: object.material?.color?.clone() || new Color('#a9b7c9'),
        metalness: 0.38,
        roughness: 0.55,
        side: DoubleSide,
      })
      found.push({
        id,
        label: info?.name || `Деталь ${found.length + 1}`,
        sourceName,
        triangles,
        category: info?.category,
        description: info?.description,
        status: info?.status,
        metrics: info?.metrics || [],
      })
    })
    return found
  }, [scene])

  useEffect(() => onLoaded(parts), [onLoaded, parts])

  useEffect(() => {
    scene.traverse((object) => {
      if (!object.isMesh) return
      const id = object.userData.partId
      const active = id === selectedId
      const hovered = id === hoveredId
      const attention = DATA_BY_NODE.get(object.name)?.status === 'attention'
      object.material.color.set(active ? '#63d6c0' : hovered ? '#d7f4f0' : attention ? '#d98d69' : '#9cabbd')
      object.material.emissive.set(active ? '#138f82' : hovered ? '#2c5165' : attention ? '#763c24' : '#000000')
      object.material.emissiveIntensity = active ? 0.55 : hovered ? 0.22 : attention ? 0.2 : 0
    })
  }, [scene, selectedId, hoveredId])

  return (
    <primitive
      object={scene}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(event.object.userData.partId)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        onHover(event.object.userData.partId)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(event) => {
        event.stopPropagation()
        onHover(null)
        document.body.style.cursor = ''
      }}
    />
  )
}

function FitButton({ resetSignal }) {
  const bounds = useBounds()
  useEffect(() => {
    bounds.refresh().fit()
  }, [bounds, resetSignal])
  return null
}

function Scene({ selectedId, hoveredId, onSelect, onHover, onLoaded, resetSignal }) {
  return (
    <Canvas
      camera={{ position: [3, 2.5, 5], fov: 40 }}
      dpr={[1, 2]}
      onPointerMissed={() => onSelect(null)}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1.35} />
      <directionalLight position={[5, 8, 6]} intensity={2.4} />
      <directionalLight position={[-4, 2, -5]} intensity={0.9} color="#66cde1" />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.25}>
          <PartModel
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={onSelect}
            onHover={onHover}
            onLoaded={onLoaded}
          />
          <FitButton resetSignal={resetSignal} />
        </Bounds>
      </Suspense>
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={0.2} />
    </Canvas>
  )
}

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const paths = {
    cube: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="M3 7v10l9 5 9-5V7M12 12v10" /></>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
    rotate: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v5h5" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  }
  return <svg {...common} aria-hidden="true">{paths[name]}</svg>
}

export default function App() {
  const [parts, setParts] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [resetSignal, setResetSignal] = useState(0)
  const selectedPart = parts.find((part) => part.id === selectedId)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark"><Icon name="cube" size={21} /></div>
        <div className="brand-copy"><strong>SmartEnergy</strong><span>3D ПРОТОТИП</span></div>
        <div className="topbar-divider" />
        <div className="page-title">Обзор энергоустановки</div>
        <div className="topbar-spacer" />
      </header>

      <main className="workspace">
        <aside className="parts-panel">
          <div className="panel-heading">
            <div className="panel-icon"><Icon name="layers" /></div>
            <div><h2>Структура модели</h2><p>Выберите деталь для просмотра</p></div>
          </div>
          <div className="panel-section-title"><span>ОБЪЕКТЫ</span><span className="count-badge">{parts.length || '…'}</span></div>
          <div className="parts-list">
            {parts.map((part) => (
              <button
                key={part.id}
                className={`part-row ${selectedId === part.id ? 'selected' : ''} ${part.status === 'attention' ? 'attention' : ''}`}
                onClick={() => setSelectedId(part.id)}
              >
                <span className="part-index">{part.id.replace('part-', '').padStart(2, '0')}</span>
                <span className="part-name">{part.label}</span>
                <span className="part-status" />
              </button>
            ))}
          </div>
        </aside>

        <section className="viewer-panel" aria-label="Интерактивная 3D-модель">
          <div className="viewer-header"><span className="eyebrow">ИНТЕРАКТИВНАЯ МОДЕЛЬ</span><span className="file-name">Engine.glb</span></div>
          <div className="viewer-stage">
            <div className="stage-glow" />
            <Scene selectedId={selectedId} hoveredId={hoveredId} onSelect={setSelectedId} onHover={setHoveredId} onLoaded={setParts} resetSignal={resetSignal} />
            <div className="viewer-hint">Перетащите для вращения <span>·</span> Колесо для масштаба <span>·</span> Нажмите на деталь</div>
          </div>
          <div className="viewer-footer"><div className="model-meta"><span className="live-indicator" />Модель загружена <span className="meta-divider">/</span> {parts.length} объектов</div><button className="reset-button" onClick={() => setResetSignal((n) => n + 1)}><Icon name="rotate" size={16} /> Показать целиком</button></div>
        </section>

        <aside className="details-panel">
          <div className="panel-heading"><div className="panel-icon"><Icon name="target" /></div><div><h2>Инспектор</h2><p>Данные выбранного объекта</p></div></div>
          {selectedPart ? (
            <div className="details-content">
              <div className="selection-label">ВЫБРАННЫЙ ОБЪЕКТ</div>
              <h1>{selectedPart.label}</h1>
              <span className={`selection-chip ${selectedPart.status === 'attention' ? 'attention' : ''}`}><span />{selectedPart.status === 'attention' ? 'Отклонение температуры' : 'Выбрана в 3D-модели'}</span>
              {selectedPart.description && <p className="part-description">{selectedPart.description}</p>}
              <div className="details-rule" />
              <div className="selection-label">ПОКАЗАТЕЛИ</div>
              <div className="metrics-grid">
                {selectedPart.metrics.map((metric) => (
                  <div className="metric-card" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value.toLocaleString('ru-RU')} <small>{metric.unit}</small></strong>
                  </div>
                ))}
              </div>
              <div className="details-rule" />
              {selectedPart.category && <div className="data-row"><span>Узел</span><strong>{selectedPart.category}</strong></div>}
              <div className="data-row"><span>Имя в файле</span><code>{selectedPart.sourceName}</code></div>
              <div className="data-row"><span>Треугольников</span><strong>{selectedPart.triangles.toLocaleString('ru-RU')}</strong></div>
            </div>
          ) : (
            <div className="empty-state"><div className="empty-illustration"><Icon name="target" size={32} /></div><h3>Выберите деталь</h3><p>Нажмите на объект в модели или в списке слева, чтобы посмотреть информацию о нём.</p></div>
          )}
        </aside>
      </main>
    </div>
  )
}
