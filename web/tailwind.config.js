/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
			},
			colors: {
				// BazaarPH Clean Colors
				primary: {
					DEFAULT: '#FF6A00',
					dark: '#D94F00',
					light: '#FF8534',
					soft: '#FFF4EC',
					foreground: '#FFFFFF'
				},
				// Text Colors
				text: {
					primary: '#151515',
					secondary: '#4B5563',
					muted: '#9CA3AF'
				},
				secondary: {
					DEFAULT: '#FFB800',
					dark: '#E5A600',
					foreground: '#1A1A1A'
				},
				background: {
					DEFAULT: '#FFFFFF',
					gray: '#F5F5F7',
					dark: '#1A1A1A'
				},
				text: {
					primary: '#1A1A1A',
					secondary: '#6B6B6B',
					light: '#9E9E9E',
					white: '#FFFFFF'
				},
				success: '#4CAF50',
				warning: '#FFC107',
				error: '#F44336',
				info: '#2196F3',
				foreground: '#1A1A1A',
				card: {
					DEFAULT: '#FFFFFF',
					foreground: '#1A1A1A'
				},
				popover: {
					DEFAULT: '#FFFFFF',
					foreground: '#1A1A1A'
				},
				muted: {
					DEFAULT: '#F5F5F7',
					foreground: '#6B6B6B'
				},
				accent: {
					DEFAULT: '#FF6A00',
					foreground: '#FFFFFF'
				},
				destructive: {
					DEFAULT: '#F44336',
					foreground: '#FFFFFF'
				},
				border: '#E5E5E7',
				input: '#F5F5F7',
				ring: '#FF6A00',
				chart: {
					'1': '#FF6A00',
					'2': '#FFB800',
					'3': '#4CAF50',
					'4': '#2196F3',
					'5': '#F44336'
				}
			},
			fontFamily: {
				sans: [
					'Inter',
					'system-ui',
					'sans-serif'
				]
			},
			borderRadius: {
				DEFAULT: '8px',
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			boxShadow: {
				card: '0 2px 8px rgba(0, 0, 0, 0.08)',
				'card-hover': '0 4px 16px rgba(0, 0, 0, 0.12)'
			},
			animation: {
				'fade-in': 'fadeIn 0.5s ease-in-out',
				'slide-up': 'slideUp 0.5s ease-out',
				'scale-in': 'scaleIn 0.3s ease-out',
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			},
			keyframes: {
				fadeIn: {
					'0%': {
						opacity: '0'
					},
					'100%': {
						opacity: '1'
					}
				},
				slideUp: {
					'0%': {
						transform: 'translateY(20px)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateY(0)',
						opacity: '1'
					}
				},
				scaleIn: {
					'0%': {
						transform: 'scale(0.9)',
						opacity: '0'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				},
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				}
			},
			backgroundImage: {
				'gradient-conic': 'conic-gradient(var(--conic-position), var(--tw-gradient-stops))',
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
}
