import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import handlebars from 'vite-plugin-handlebars'
import { resolve } from 'path'

export default defineConfig({
  base: '/luxury-cars/',
  plugins: [
    tailwindcss(),
    handlebars({
      partialDirectory: resolve(__dirname, 'src/partials'),
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main:       resolve(__dirname, 'index.html'),
        fleet:      resolve(__dirname, 'pages/fleet.html'),
        checkout:   resolve(__dirname, 'pages/checkout.html'),
        login:      resolve(__dirname, 'pages/login.html'),
        register:   resolve(__dirname, 'pages/register.html'),
        myBookings: resolve(__dirname, 'pages/my-bookings.html'),
      },
    },
  },
})
