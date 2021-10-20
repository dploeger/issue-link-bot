FROM node:16

WORKDIR /issue-link-bot

COPY index.ts index.ts
COPY package-lock.json package-lock.json
COPY package.json package.json
COPY tsconfig.json tsconfig.json
COPY .eslintrc.json .eslintrc.json
COPY .prettierrc.yaml .prettierrc.yaml

RUN npm install
RUN npm run lint && npm run build

ENTRYPOINT ["node", "index.js"]
