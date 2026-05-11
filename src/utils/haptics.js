const haptics = {
  tap:         () => { try { navigator.vibrate?.(10);                     } catch (_) {} },
  pour:        () => { try { navigator.vibrate?.(12);                     } catch (_) {} },
  shake:       () => { try { navigator.vibrate?.([40, 20, 40]);           } catch (_) {} },
  success:     () => { try { navigator.vibrate?.([60, 30, 100, 30, 200]); } catch (_) {} },
  warning:     () => { try { navigator.vibrate?.([150, 50, 150]);         } catch (_) {} },
  error:       () => { try { navigator.vibrate?.([300]);                  } catch (_) {} },
  achievement: () => { try { navigator.vibrate?.([50, 30, 50, 30, 50, 30, 250]); } catch (_) {} },
  reading:     () => { try { navigator.vibrate?.(25);                     } catch (_) {} },
}

export default haptics
