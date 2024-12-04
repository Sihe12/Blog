# Full Stack Application Template

Modern blog web application with Vue.js frontend, Node.js backend, and MySQL database. Supports both Docker and Kubernetes deployment.

## Features

- Vue.js frontend with Vite
- Node.js backend with Express
- MySQL database
- Docker and Kubernetes deployment support
- Environment variable management
- Testing setup with Jest

## Getting Started

### Environment Setup

1. Create `.env` in root directory:
```
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=yourdatabase
MYSQL_USER=youruser
MYSQL_PASSWORD=yourpassword
JWT_SECRET=yourjwtsecret

WEATHER_API_KEY= yourKey
HUGGING_FACE_API_KEY=yourKey
```
2. For testing: Create `.env.test` in tests directory:
```
MYSQL_HOST=mysql
MYSQL_USER=youruser
MYSQL_PASSWORD=yourpassword
MYSQL_DATABASE=yourdatabase
JWT_SECRET=yourjwtsecret
MYSQL_ROOT_PASSWORD=yourrootpassword
```

## Accessing the App
## Docker
Access the app at `http://localhost:8080`.

## Kubernetes
Access the frontend via frontend cluster IP
```
ex: frontend-service   LoadBalancer   10.107.126.123   <pending>     8080:30763/TCP   13m
```


## Docker Deployment
Build and start services:
```bash
docker-compose up --build
```

## Kubernetes Deployment

1. Start the local registry:
```bash
docker run -d -p 5000:5000 --restart=always --name registry registry:2
```

2. Build the images:
```bash
# On VM
docker buildx build -t backend:latest ./backend
docker buildx build -t frontend:latest ./frontend

# Local
docker build -t backend:latest ./backend
docker build -t frontend:latest ./frontend
```

3. Tag and push images:
```bash
docker tag backend localhost:5000/dev/backend
docker tag frontend localhost:5000/dev/frontend
docker push localhost:5000/dev/backend
docker push localhost:5000/dev/frontend
```

4. Add to `/etc/docker/daemon.json` (local only):
```json
{
  "insecure-registries": ["localhost:5000"]
}
```

5. Create the `secrets.yaml` file :
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: secrets
type: Opaque
stringData:
  mysql-root-password: rootpassword
  mysql-database: yourdatabase
  mysql-user: youruser
  mysql-password: yourpassword
  JWT_SECRET: yourjwtsecret
  WEATHER_API_KEY: yourKey
  HUGGING_FACE_API_KEY: yourKey
```

6. Deploy to Kubernetes:
```bash
kubectl apply -f secrets.yaml
kubectl apply -f mysql-persistentVolumeClaim.yaml
kubectl apply -f mysql-persistent-volume.yaml
kubectl apply -f mysql-deployment.yaml
kubectl apply -f mysql-service.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml

```
## Tests
To run the tests, follow these steps:
1. Go to the tests folder.
2. Install the dependencies: `npm intall`.
3. Run the tests: `npx jest`.


## Cleanup

### Remove Kubernetes Resources
```bash
kubectl delete -f secrets.yaml --force --grace-period=0
kubectl delete -f mysql-persistentVolumeClaim.yaml --force --grace-period=0
kubectl delete -f mysql-persistent-volume.yaml --force --grace-period=0
kubectl delete -f mysql-deployment.yaml --force --grace-period=0
kubectl delete -f mysql-service.yaml --force --grace-period=0
kubectl delete -f backend-deployment.yaml --force --grace-period=0
kubectl delete -f backend-service.yaml --force --grace-period=0
kubectl delete -f frontend-deployment.yaml --force --grace-period=0
kubectl delete -f frontend-service.yaml --force --grace-period=0

# If PVC is stuck
kubectl patch pvc mysql-pv-claim -p '{"metadata":{"finalizers":null}}'

# Clear any remaining if needed
kubectl delete pods --all --grace-period=0 --force
kubectl delete deployments --all --grace-period=0 --force
kubectl delete services --all --grace-period=0 --force
kubectl delete pvc --all --grace-period=0 --force
kubectl delete pv --all --grace-period=0 --force
kubectl delete configmaps --all --grace-period=0 --force
kubectl delete secrets --all --grace-period=0 --force
```
