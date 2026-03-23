import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Ride {
  id: string;
  driverId: string;
  driverName: string;
  source: string;
  destination: string;
  date: string;
  time: string;
  availableSeats: number;
  pricePerSeat: number;
  vehicleType: string;
  vehicleNumber: string;
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

interface RidesState {
  rides: Ride[];
  loading: boolean;
  error: string | null;
  selectedRide: Ride | null;
}

const initialState: RidesState = {
  rides: [],
  loading: false,
  error: null,
  selectedRide: null,
};

const ridesSlice = createSlice({
  name: 'rides',
  initialState,
  reducers: {
    fetchRidesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchRidesSuccess: (state, action: PayloadAction<Ride[]>) => {
      state.loading = false;
      state.rides = action.payload;
      state.error = null;
    },
    fetchRidesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    createRideSuccess: (state, action: PayloadAction<Ride>) => {
      state.rides.unshift(action.payload);
    },
    selectRide: (state, action: PayloadAction<Ride>) => {
      state.selectedRide = action.payload;
    },
    clearSelectedRide: (state) => {
      state.selectedRide = null;
    },
  },
});

export const { 
  fetchRidesStart, 
  fetchRidesSuccess, 
  fetchRidesFailure, 
  createRideSuccess,
  selectRide,
  clearSelectedRide
} = ridesSlice.actions;
export default ridesSlice.reducer; 