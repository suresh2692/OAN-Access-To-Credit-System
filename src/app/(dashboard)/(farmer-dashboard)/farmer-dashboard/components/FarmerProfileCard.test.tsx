import { authReducer } from '@/features/auth/store/authSlice';
import type { FarmerDashboardProfile } from '@/features/(farmer-application)/types';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import FarmerProfileCard from './FarmerProfileCard';

function renderCard(
  profile: FarmerDashboardProfile | undefined,
  accountName: string | null = 'Farmer Ethopia'
) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: accountName
          ? ({ kind: 'farmer', email: 'f@oan.test', name: accountName } as const)
          : null,
        status: 'succeeded' as const,
        error: null,
      },
    },
  });
  render(
    <Provider store={store}>
      <FarmerProfileCard profile={profile} />
    </Provider>
  );
}

describe('FarmerProfileCard', () => {
  it('falls back to the account name when no profile is bound', () => {
    // get_dashboard_summary sends `{}` for a farmer with no A2C Farmer Profile,
    // which is truthy — the old `if (!profile) return null` never fired, and the
    // heading rendered empty. This is the reported bug.
    renderCard({});

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Farmer Ethopia');
  });

  it('does not claim Verified over an empty profile', () => {
    renderCard({});

    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    expect(screen.getByText('Profile incomplete')).toBeInTheDocument();
  });

  it('prefers the profile name over the account name', () => {
    renderCard({ first_name: 'Postman', last_name: 'Farmer', farmer_id: 'FARMER-2026-02828' });

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Postman Farmer');
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('treats a profile whose fields are all empty as unbound', () => {
    // A profile row can exist with nothing filled in; it is no more verified than
    // no row at all, and it must not blank the heading either.
    renderCard({ first_name: null, last_name: null, farmer_id: null, region: null });

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Farmer Ethopia');
    expect(screen.getByText('Profile incomplete')).toBeInTheDocument();
  });

  it('renders a name even with no profile and no resolved account', () => {
    // The farmer layout does not gate on auth resolution, so the store can still
    // be empty on first paint. A role label beats an empty heading.
    renderCard(undefined, null);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Farmer');
  });

  it('derives the avatar initials from the name it actually shows', () => {
    renderCard({});
    expect(screen.getByText('FE')).toBeInTheDocument();
  });

  it('still shows the stored profile details when they are present', () => {
    renderCard({
      first_name: 'Postman',
      last_name: 'Farmer',
      farmer_id: 'FARMER-2026-02828',
      kebele: 'Kebele 5',
      woreda: 'Adama',
      region: 'Oromia',
      farmland_size_hectares: 2.5,
      land_ownership_status: 'Owned',
      source_of_income: 'Crop farming',
    });

    expect(screen.getByText('FARMER-2026-02828')).toBeInTheDocument();
    expect(screen.getByText('Kebele 5, Adama, Oromia')).toBeInTheDocument();
    expect(screen.getByText('Land: 2.5 ha')).toBeInTheDocument();
    expect(screen.getByText('Owned')).toBeInTheDocument();
    expect(screen.getByText('Crop farming')).toBeInTheDocument();
  });
});
