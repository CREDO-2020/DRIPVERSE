import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import { ArrowRight, Check, X } from 'lucide-react'
import { supabase } from './lib/supabase.js'

const palettes = [
  { name: 'Obsidian', value: '#191919' },
  { name: 'Bone', value: '#d8d1c4' },
  { name: 'Olive', value: '#6b7152' },
  { name: 'Burgundy', value: '#672d3a' },
  { name: 'Electric Blue', value: '#3155d9' },
]
function Avatar({ topColor, pantsColor, shoeColor, accessory }) {
  return <group position={[0, -1.15, 0]}>
    <mesh position={[0, 1.55, 0]} castShadow><sphereGeometry args={[0.28, 32, 32]}/><meshStandardMaterial color="#b78362" roughness={0.7}/></mesh>
    <mesh position={[0, 1.82, 0]} castShadow><sphereGeometry args={[0.29, 32, 32]}/><meshStandardMaterial color="#171717" roughness={0.9}/></mesh>
    <mesh position={[0, 1.02, 0]} castShadow><capsuleGeometry args={[0.36, 0.56, 8, 18]}/><meshStandardMaterial color={topColor} roughness={0.85}/></mesh>
    <mesh position={[-0.43, 1.03, 0]} rotation={[0,0,-0.18]} castShadow><capsuleGeometry args={[0.12, 0.55, 6, 12]}/><meshStandardMaterial color={topColor} roughness={0.85}/></mesh>
    <mesh position={[0.43, 1.03, 0]} rotation={[0,0,0.18]} castShadow><capsuleGeometry args={[0.12, 0.55, 6, 12]}/><meshStandardMaterial color={topColor} roughness={0.85}/></mesh>
    <mesh position={[-0.19, 0.35, 0]} castShadow><capsuleGeometry args={[0.15, 0.72, 6, 12]}/><meshStandardMaterial color={pantsColor} roughness={0.9}/></mesh>
    <mesh position={[0.19, 0.35, 0]} castShadow><capsuleGeometry args={[0.15, 0.72, 6, 12]}/><meshStandardMaterial color={pantsColor} roughness={0.9}/></mesh>
    <mesh position={[-0.2, -0.12, 0.08]} castShadow><boxGeometry args={[0.28,0.14,0.48]}/><meshStandardMaterial color={shoeColor} roughness={0.65}/></mesh>
    <mesh position={[0.2, -0.12, 0.08]} castShadow><boxGeometry args={[0.28,0.14,0.48]}/><meshStandardMaterial color={shoeColor} roughness={0.65}/></mesh>
    {accessory === 'cap' && <group><mesh position={[0, 1.98, 0]} castShadow><sphereGeometry args={[0.3, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]}/><meshStandardMaterial color={topColor} roughness={0.8}/></mesh><mesh position={[0, 1.9, 0.18]} castShadow><boxGeometry args={[0.34, 0.035, 0.22]}/><meshStandardMaterial color={topColor} roughness={0.8}/></mesh></group>}
    {accessory === 'chain' && <mesh position={[0, 1.04, 0.31]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.24, 0.025, 8, 32]}/><meshStandardMaterial color="#c8b16e" metalness={0.8} roughness={0.28}/></mesh>}
    {accessory === 'crossbody' && <group><mesh position={[-0.13, 1.05, 0.3]} rotation={[0, 0, -0.48]} castShadow><capsuleGeometry args={[0.035, 0.72, 4, 8]}/><meshStandardMaterial color="#b9ad98" roughness={0.65}/></mesh><mesh position={[0.25, 0.72, 0.29]} castShadow><boxGeometry args={[0.25, 0.27, 0.13]}/><meshStandardMaterial color="#262626" roughness={0.7}/></mesh></group>}
  </group>
}

export default function StudioModal({ user, initialLook = null, onClose, notify }) {
  const [top, setTop] = useState(palettes[0].value)
  const [pants, setPants] = useState('#383838')
  const [shoes, setShoes] = useState('#e6e1d8')
  const [accessory, setAccessory] = useState('none')
  const [lookName, setLookName] = useState('Midnight uniform')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [savedLooks, setSavedLooks] = useState([])

  useEffect(() => {
    if (!initialLook) return
    setLookName(initialLook.name || 'My look')
    setTop(initialLook.avatar_config?.top || palettes[0].value)
    setPants(initialLook.avatar_config?.pants || '#383838')
    setShoes(initialLook.avatar_config?.shoes || '#e6e1d8')
    setAccessory(initialLook.avatar_config?.accessory || 'none')
  }, [initialLook])

  useEffect(() => {
    let active = true
    if (!user) { setSavedLooks([]); return () => { active = false } }
    supabase.from('outfits').select('id,name,avatar_config,created_at').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data, error }) => { if (active && !error) setSavedLooks(data || []) })
    return () => { active = false }
  }, [user])

  async function saveLook() {
    if (!user) {
      setMessage('Sign in first to save this outfit to your account.')
      return
    }
    setSaving(true)
    setMessage('')
    const outfit = {
      user_id: user.id,
      name: lookName.trim() || 'My look',
      avatar_config: { top, pants, shoes, accessory },
      is_public: false,
    }
    const query = initialLook?.id
      ? supabase.from('outfits').update(outfit).eq('id', initialLook.id).eq('user_id', user.id)
      : supabase.from('outfits').insert(outfit)
    const { data, error } = await query.select('id,name,avatar_config,created_at').single()
    setSaving(false)
    if (error) setMessage('Could not save this look. Please try again.')
    else {
      setSavedLooks(old => initialLook?.id ? old.map(look => look.id === data.id ? data : look) : [data, ...old])
      setMessage(initialLook?.id ? 'Saved outfit updated.' : 'Look saved to your account.')
      notify(initialLook?.id ? 'Your saved look was updated' : 'Your look has been saved')
    }
  }

  return <div className="studio-modal-backdrop" onClick={onClose}>
    <section className="studio-modal" onClick={e => e.stopPropagation()}>
      <button className="studio-close icon-button" onClick={onClose} aria-label="Close studio"><X/></button>
      <div className="studio-modal-heading"><p className="eyebrow">DRIPVERSE STYLE LAB / 001</p><h2>{initialLook ? 'EDIT YOUR ' : 'BUILD YOUR '}<em>{initialLook ? 'LOOK.' : 'UNIFORM.'}</em></h2><p>Rotate the avatar and experiment with color combinations.</p></div>
      <div className="studio-layout">
        <div className="avatar-stage"><Canvas camera={{ position: [3.2, 2.1, 4.5], fov: 38 }} shadows><color attach="background" args={['#171717']}/><ambientLight intensity={1.3}/><directionalLight position={[4,6,4]} intensity={2} castShadow/><pointLight position={[-3,2,-2]} intensity={18} color="#9a8b70"/><Avatar topColor={top} pantsColor={pants} shoeColor={shoes} accessory={accessory}/><ContactShadows position={[0,-1.3,0]} opacity={0.4} scale={4} blur={2.5}/><OrbitControls enablePan={false} minDistance={3} maxDistance={7} minPolarAngle={0.7} maxPolarAngle={2.2}/></Canvas><span className="stage-label">INTERACTIVE 3D / DRAG TO ROTATE</span></div>
        <div className="studio-controls">
          <label className="studio-name-label">LOOK NAME<input value={lookName} onChange={e=>setLookName(e.target.value)} maxLength={60}/></label>
          <div className="swatch-group"><p>01 / TOP LAYER</p><div className="swatch-row">{palettes.map(p=><button key={p.value} title={p.name} aria-label={p.name} className={top===p.value?'color-swatch chosen':'color-swatch'} style={{background:p.value}} onClick={()=>setTop(p.value)}>{top===p.value&&<Check size={14} color={p.value==='#d8d1c4'?'#111':'white'}/>}</button>)}</div><span>{palettes.find(p=>p.value===top)?.name}</span></div>
          <div className="swatch-group"><p>02 / TROUSERS</p><div className="swatch-row">{['#252525','#77766f','#5c654b','#c6bba8'].map(c=><button key={c} aria-label={'Trousers '+c} className={pants===c?'color-swatch chosen':'color-swatch'} style={{background:c}} onClick={()=>setPants(c)}>{pants===c&&<Check size={14}/>}</button>)}</div></div>
          <div className="swatch-group"><p>03 / SNEAKERS</p><div className="swatch-row">{['#e6e1d8','#1a1a1a','#8a8a8a'].map(c=><button key={c} aria-label={'Sneakers '+c} className={shoes===c?'color-swatch chosen':'color-swatch'} style={{background:c}} onClick={()=>setShoes(c)}>{shoes===c&&<Check size={14} color={c==='#e6e1d8'?'#111':'white'}/>}</button>)}</div></div>
          <div className="swatch-group studio-accessory-group"><p>04 / ACCESSORIES</p><div className="studio-accessory-options">{[{ value: 'none', label: 'None' }, { value: 'cap', label: 'Cap' }, { value: 'chain', label: 'Chain' }, { value: 'crossbody', label: 'Crossbody' }].map(option => <button key={option.value} className={accessory === option.value ? 'studio-accessory-option is-selected' : 'studio-accessory-option'} onClick={() => setAccessory(option.value)} aria-pressed={accessory === option.value}>{option.label}</button>)}</div></div>
          <button className="studio-reset-button" onClick={() => { setTop(palettes[0].value); setPants('#252525'); setShoes('#e6e1d8'); setAccessory('none'); setLookName('Midnight uniform'); setMessage('Outfit reset to the Midnight uniform.') }}>RESET OUTFIT</button>
          <button className="button button-light full-button save-look" onClick={saveLook} disabled={saving}>{saving?'SAVING LOOK…':initialLook ? 'UPDATE SAVED LOOK' : 'SAVE THIS LOOK'} <ArrowRight size={16}/></button>
          {message&&<p className="studio-save-message" role="status">{message}</p>}
          {!user&&<p className="studio-login-note">Sign in to keep your custom looks saved to your profile.</p>}
          {user&&<div className="saved-looks"><p className="eyebrow">YOUR SAVED LOOKS · {savedLooks.length}</p>{savedLooks.length===0?<span>Your first saved look will appear here.</span>:savedLooks.slice(0,4).map(look=><button className="saved-look-row" key={look.id} onClick={()=>{setLookName(look.name);setTop(look.avatar_config?.top||palettes[0].value);setPants(look.avatar_config?.pants||'#383838');setShoes(look.avatar_config?.shoes||'#e6e1d8');setAccessory(look.avatar_config?.accessory||'none')}}><span className="saved-look-dots"><i style={{background:look.avatar_config?.top||'#191919'}}/><i style={{background:look.avatar_config?.pants||'#383838'}}/><i style={{background:look.avatar_config?.shoes||'#e6e1d8'}}/></span><span>{look.name}</span><ArrowRight size={13}/></button>)}</div>}
        </div>
      </div>
    </section>
  </div>
}
