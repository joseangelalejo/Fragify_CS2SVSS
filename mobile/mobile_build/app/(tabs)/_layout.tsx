import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'

const C = { bg: '#0b0c10', card: '#111318', border: '#1e2029', orange: '#f97316', t3: '#475569' }

function Icon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: '#f1f5f9',
        headerTitleStyle: { fontWeight: '800', letterSpacing: 1 },
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: C.orange,
        tabBarInactiveTintColor: C.t3,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mi Perfil',
          tabBarIcon: ({ focused }) => <Icon emoji="👤" focused={focused} />,
          headerTitle: 'FRAGIFY',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ focused }) => <Icon emoji="🔍" focused={focused} />,
          headerTitle: 'Buscar Jugador',
        }}
      />
      <Tabs.Screen
        name="leaderboards"
        options={{
          title: 'Rankings',
          tabBarIcon: ({ focused }) => <Icon emoji="🏆" focused={focused} />,
          headerTitle: 'Leaderboards',
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Partidas',
          tabBarIcon: ({ focused }) => <Icon emoji="🎮" focused={focused} />,
          headerTitle: 'Historial',
        }}
      />
    </Tabs>
  )
}
