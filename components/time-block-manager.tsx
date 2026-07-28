'use client'

import { useState, useEffect } from 'react'
import { createTimeBlock, getTimeBlocks, deleteTimeBlock } from '@/app/actions/blocks'
import { Button } from '@/components/ui/button'
import { Clock, Trash2, Plus } from 'lucide-react'

interface TimeBlock {
  id: number
  userId: string
  calendarId: number
  blockStart: Date
  blockEnd: Date
  reason: string | null
}

export function TimeBlockManager({ calendarId }: { calendarId: number }) {
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [reason, setReason] = useState('')

  useEffect(() => {
    loadBlocks()
  }, [])

  async function loadBlocks() {
    setIsLoading(true)
    try {
      const data = await getTimeBlocks()
      setBlocks(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAdd() {
    if (!date || !startTime || !endTime) return
    const blockStart = new Date(`${date}T${startTime}:00`)
    const blockEnd = new Date(`${date}T${endTime}:00`)
    if (blockEnd <= blockStart) return

    await createTimeBlock(calendarId, blockStart, blockEnd, reason || undefined)
    setShowForm(false)
    setDate('')
    setStartTime('09:00')
    setEndTime('10:00')
    setReason('')
    await loadBlocks()
  }

  async function handleDelete(id: number) {
    await deleteTimeBlock(id)
    await loadBlocks()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Blocked Times
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add Block
        </button>
      </div>

      {showForm && (
        <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Lunch break, Meeting"
              className="w-full mt-1 px-3 py-1.5 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} size="sm" className="flex-1">Save Block</Button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : blocks.length === 0 ? (
        <p className="text-xs text-muted-foreground">No blocked times scheduled.</p>
      ) : (
        <div className="space-y-2">
          {blocks.slice(0, 10).map((block) => (
            <div key={block.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
              <div className="text-xs">
                <p className="font-medium text-foreground">
                  {new Date(block.blockStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' '}{new Date(block.blockStart).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {new Date(block.blockEnd).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {block.reason && <p className="text-muted-foreground">{block.reason}</p>}
              </div>
              <button
                onClick={() => handleDelete(block.id)}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
