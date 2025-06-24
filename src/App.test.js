import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  test('renders app title', () => {
    render(<App />);
    const titleElement = screen.getByText(/Finanzas Personales/i);
    expect(titleElement).toBeInTheDocument();
  });

  test('renders navigation buttons', () => {
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Movimientos')).toBeInTheDocument();
    expect(screen.getByText('Ahorros')).toBeInTheDocument();
    expect(screen.getByText('Metas')).toBeInTheDocument();
  });

  test('switches view when clicking navigation buttons', () => {
  render(<App />);
    
    // Click on Movimientos
    fireEvent.click(screen.getByText('Movimientos'));
    expect(screen.getByText('Gestión de Movimientos')).toBeInTheDocument();
    
    // Click on Ahorros
    fireEvent.click(screen.getByText('Ahorros'));
    expect(screen.getByText('Gestión de Ahorros')).toBeInTheDocument();
    
    // Click on Metas
    fireEvent.click(screen.getByText('Metas'));
    expect(screen.getByText('Gestión de Metas')).toBeInTheDocument();
    
    // Click back to Dashboard
    fireEvent.click(screen.getByText('Dashboard'));
    expect(screen.getByText('Dashboard Financiero')).toBeInTheDocument();
  });
});
