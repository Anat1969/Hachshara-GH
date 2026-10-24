import { useEffect, useRef, useSyncExternalStore } from 'react'

// Editing actions that a page adds to the menu while it is shown (useMenuItems).
const pageItems = new Map()
const subs = new Set()
let snapshot = []
const publish = () => { snapshot = [...pageItems.values()].flat(); subs.forEach((f) => f()) }

export function useMenuItems(key, items) {
  useEffect(() => {
    if (!items || !items.length) return
    pageItems.set(key, items)
    publish()
    return () => { pageItems.delete(key); publish() }
  }, [key, items])
}

/**
 * The A&I logo button (<ai-menu> from https://appofapp-gh.vercel.app/ai-menu.js).
 * Every editing and development action lives inside it.
 */
export default function AIMenu({ chat, research, items = [], status = '' }) {
  const ref = useRef(null)
  const fromPages = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => snapshot)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.items = [...items, ...fromPages]
    el.status = status
  }, [items, fromPages, status])
  return <ai-menu ref={ref} chat={chat || undefined} research={research || undefined} />
}
