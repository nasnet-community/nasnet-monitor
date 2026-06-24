export function Lights() {
  return (
    <>
      <hemisphereLight args={[0x9fb4d0, 0x05060a, 0.55]} />
      <directionalLight color={0xffffff} intensity={2.1} position={[3.5, 6, 4]} />
      <directionalLight color={0x88aaff} intensity={0.5} position={[-4, 2, -2]} />
      <spotLight
        color={0xffffff}
        intensity={1.2}
        distance={30}
        angle={0.7}
        penumbra={0.6}
        position={[-2, 5, -5]}
      />
    </>
  )
}
