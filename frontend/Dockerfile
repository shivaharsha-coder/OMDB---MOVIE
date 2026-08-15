# Frontend Dockerfile - serves static HTML via nginx
FROM nginx:alpine

# Copy frontend files to nginx web root
COPY . /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
