import type { Occupant } from './types';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  occupants: Occupant[];
  temperature: number;
  humidity: number;
}

export const DEFAULT_OCCUPANTS: Occupant[] = [
  { id: 'a', label: 'Person A', x: 0.32, y: 0.42, active: true },
  { id: 'b', label: 'Person B', x: 0.68, y: 0.36, active: true },
  { id: 'c', label: 'Person C', x: 0.5, y: 0.62, active: false },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'single',
    name: 'One occupant',
    description: 'A single person seated off-center. AeroMind aims directly with a narrow swing.',
    occupants: [
      { id: 'a', label: 'Person A', x: 0.3, y: 0.4, active: true },
      { id: 'b', label: 'Person B', x: 0.7, y: 0.4, active: false },
      { id: 'c', label: 'Person C', x: 0.5, y: 0.65, active: false },
    ],
    temperature: 27,
    humidity: 55,
  },
  {
    id: 'multiple',
    name: 'Multiple occupants',
    description: 'Two people spread across the room. AeroMind widens the swing to cover both zones.',
    occupants: [
      { id: 'a', label: 'Person A', x: 0.2, y: 0.35, active: true },
      { id: 'b', label: 'Person B', x: 0.8, y: 0.4, active: true },
      { id: 'c', label: 'Person C', x: 0.5, y: 0.62, active: false },
    ],
    temperature: 29,
    humidity: 62,
  },
  {
    id: 'clustered',
    name: 'Close together',
    description: 'Two people close together on one side. AeroMind narrows the swing to the cluster.',
    occupants: [
      { id: 'a', label: 'Person A', x: 0.34, y: 0.4, active: true },
      { id: 'b', label: 'Person B', x: 0.44, y: 0.46, active: true },
      { id: 'c', label: 'Person C', x: 0.5, y: 0.65, active: false },
    ],
    temperature: 28,
    humidity: 58,
  },
  {
    id: 'empty',
    name: 'No occupants',
    description: 'Empty room. AeroMind turns the fan off automatically to save energy.',
    occupants: [
      { id: 'a', label: 'Person A', x: 0.3, y: 0.4, active: false },
      { id: 'b', label: 'Person B', x: 0.7, y: 0.4, active: false },
      { id: 'c', label: 'Person C', x: 0.5, y: 0.65, active: false },
    ],
    temperature: 26,
    humidity: 50,
  },
];
