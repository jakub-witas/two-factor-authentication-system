# Użyj obrazu Node.js jako bazowego
FROM node:18

# Ustaw katalog roboczy w kontenerze
WORKDIR /usr/src/app

# Skopiuj plik package.json i package-lock.json do katalogu roboczego
COPY package*.json ./

# Zainstaluj zależności
RUN npm install

# Skopiuj resztę plików aplikacji do katalogu roboczego
COPY . .

# Eksponuj port, na którym działa aplikacja
EXPOSE 3000

# Uruchom aplikację
CMD ["node", "main.js"]