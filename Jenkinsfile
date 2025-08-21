pipeline {
  agent any
  environment {
    REGISTRY = credentials('docker-registry')
    REGISTRY_URL = 'ghcr.io/<user>'
    IMAGE_BACKEND = "${REGISTRY_URL}/event-backend"
    IMAGE_FRONTEND = "${REGISTRY_URL}/event-frontend"
    SONAR_HOST_URL = 'http://sonarqube:9000'
    SONAR_TOKEN = credentials('sonarqube-token')
  }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Backend: Install & Test') {
      steps { dir('backend') { sh 'npm ci && npm test && npm run audit' } }
    }
    stage('SonarQube Scan') {
      steps {
        withSonarQubeEnv('sonarqube') {
          sh "sonar-scanner -Dsonar.projectKey=event-portal -Dsonar.sources=. -Dsonar.host.url=${SONAR_HOST_URL} -Dsonar.login=${SONAR_TOKEN}"
        }
      }
    }
    stage('Docker Build & Push') {
      steps {
        sh '''
          docker login ${REGISTRY_URL} -u ${REGISTRY_USR} -p ${REGISTRY_PSW}
          docker build -t ${IMAGE_BACKEND}:$BUILD_NUMBER backend
          docker build -t ${IMAGE_FRONTEND}:$BUILD_NUMBER frontend
          docker tag ${IMAGE_BACKEND}:$BUILD_NUMBER ${IMAGE_BACKEND}:latest
          docker tag ${IMAGE_FRONTEND}:$BUILD_NUMBER ${IMAGE_FRONTEND}:latest
          docker push ${IMAGE_BACKEND}:$BUILD_NUMBER
          docker push ${IMAGE_FRONTEND}:$BUILD_NUMBER
          docker push ${IMAGE_BACKEND}:latest
          docker push ${IMAGE_FRONTEND}:latest
        '''
      }
    }
    stage('Deploy to Minikube') {
      steps {
        sh '''
          kubectl apply -f infrastructure/k8s/namespace.yaml
          kubectl -n event-portal apply -f infrastructure/k8s/configmap-backend.yaml
          sed -i "s#<REGISTRY>#${REGISTRY_URL}#g" infrastructure/k8s/deployment-backend.yaml
          sed -i "s#<REGISTRY>#${REGISTRY_URL}#g" infrastructure/k8s/deployment-frontend.yaml
          kubectl -n event-portal apply -f infrastructure/k8s/deployment-backend.yaml
          kubectl -n event-portal apply -f infrastructure/k8s/service-backend.yaml
          kubectl -n event-portal apply -f infrastructure/k8s/deployment-frontend.yaml
          kubectl -n event-portal apply -f infrastructure/k8s/service-frontend.yaml
          kubectl -n event-portal apply -f infrastructure/k8s/ingress.yaml
        '''
      }
    }
  }
}
