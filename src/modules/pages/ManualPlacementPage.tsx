import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../utils/api'

interface Team {
  id: string
  number: number
  name: string
}

interface ManualPlacement {
  teamId: string
  place: number
}

interface CalculatedResult {
  teamId: string
  teamName: string
  teamNumber: number
  total: number
  place: number
}

const ManualPlacementPage: React.FC = () => {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [calculatedResults, setCalculatedResults] = useState<CalculatedResult[]>([])
  const [manualPlacements, setManualPlacements] = useState<ManualPlacement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  // Listen for focus events to refresh data when returning from other pages
  useEffect(() => {
    const handleFocus = () => {
      loadData()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Periodically refresh data to detect changes from other pages
  useEffect(() => {
    const interval = setInterval(() => {
      loadData()
    }, 2000) // Check every 2 seconds
    
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const user = localStorage.getItem('auth:user')
      console.log('Current user:', user)
      if (!user) {
        console.log('No user found, redirecting to login')
        navigate('/login')
        return
      }

      console.log('Making API requests...')
          const [teamsRes, resultsRes, manualRes] = await Promise.all([
            apiFetch(`/api/teams?user=${user}`),
            apiFetch(`/api/report/results?user=${user}`),
            apiFetch(`/api/manual-placement?user=${user}`)
          ])

      console.log('Teams response status:', teamsRes.status)
      console.log('Results response status:', resultsRes.status)
      console.log('Manual response status:', manualRes.status)

      const teamsData = await teamsRes.json()
      const resultsData = await resultsRes.json()
      const manualData = await manualRes.json()

      console.log('Teams data:', teamsData)
      console.log('Results data:', resultsData)
      console.log('Manual data:', manualData)

      setTeams(teamsData.teams || teamsData || [])
      setCalculatedResults(resultsData.rows || [])
      
      // Always initialize with calculated places as starting point
      const initialPlacements = (resultsData.rows || []).map((row: CalculatedResult) => ({
        teamId: row.teamId,
        place: row.place
      }))
      
      // If manual placements exist, use them; otherwise use calculated places
      if (manualData && manualData.length > 0) {
        setManualPlacements(manualData)
      } else {
        // No manual placements exist, use calculated places
        setManualPlacements(initialPlacements)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceChange = (teamId: string, place: number) => {
    setManualPlacements(prev => {
      const existing = prev.find(p => p.teamId === teamId)
      if (existing) {
        return prev.map(p => p.teamId === teamId ? { ...p, place } : p)
      } else {
        return [...prev, { teamId, place }]
      }
    })
  }

  const handleSave = async () => {
    try {
      const user = localStorage.getItem('auth:user')
      if (!user) return

      // Filter out invalid placements
      const validPlacements = manualPlacements.filter(p => p.teamId && p.place > 0)
      
      // Validate that all places are unique and in correct range
      const places = validPlacements.map(p => p.place).sort((a, b) => a - b)
      const expectedPlaces = Array.from({ length: validPlacements.length }, (_, i) => i + 1)
      
      if (places.length !== calculatedResults.length) {
        alert('Не все команды имеют назначенные места')
        return
      }
      
      if (JSON.stringify(places) !== JSON.stringify(expectedPlaces)) {
        alert('Места должны быть уникальными и идти от 1 до ' + calculatedResults.length)
        return
      }
      
      const payload = { user, placements: validPlacements }

          const response = await apiFetch(`/api/manual-placement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Server error:', response.status, errorText)
        alert(`Ошибка сохранения: ${response.status} - ${errorText}`)
        return
      }

      // Refresh data after successful save
      await loadData()
      navigate('/report')
    } catch (error) {
      console.error('Error saving manual placements:', error)
        alert('Ошибка при сохранении: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Загрузка...
      </div>
    )
  }

  if (calculatedResults.length === 0) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Ручное распределение мест</h2>
        <div style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '8px', 
          padding: '12px', 
          marginBottom: '20px',
          fontSize: '14px',
          color: '#856404'
        }}>
          Нет данных для отображения. Убедитесь, что добавлены команды и судьи, и что есть данные о результатах.
          <br /><br />
          Отладочная информация:
          <br />Команд: {teams.length}
          <br />Результатов: {calculatedResults.length}
          <br />Ручных мест: {manualPlacements.length}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => {
              // Refresh data before navigating back
              loadData()
              navigate('/report')
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Назад
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Ручное распределение мест</h2>
      <div style={{ 
        backgroundColor: '#e7f3ff', 
        border: '1px solid #b3d9ff', 
        borderRadius: '8px', 
        padding: '12px', 
        marginBottom: '20px',
        fontSize: '14px',
        color: '#0066cc'
      }}>
        Поля мест предзаполнены рассчитанными данными. Вы можете изменить места команд на любые значения независимо от набранных баллов.
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        {calculatedResults
          .sort((a, b) => a.place - b.place)
          .map((result) => (
          <div key={result.teamId} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '10px',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {result.teamNumber}. {result.teamName}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Итого баллов: {result.total}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>
                Место:
              </span>
              <input
                type="number"
                placeholder="Место"
                value={manualPlacements.find(p => p.teamId === result.teamId)?.place || ''}
                onChange={(e) => handlePlaceChange(result.teamId, parseInt(e.target.value) || 0)}
                style={{
                  width: '60px',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={() => {
            // Refresh data before navigating back
            loadData()
            navigate('/report')
          }}
          style={{
            padding: '12px 24px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Назад
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Сохранить
        </button>
      </div>
    </div>
  )
}

export default ManualPlacementPage
