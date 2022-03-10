# Server per Control Production 
Questo progetto consente l'installazione di un database mongodb, un server Parse ed una dashboard pern il controllo del server. 
## Installazione (https://github.com/bitnami/bitnami-docker-parse)
1) Installare Docker https://www.docker.com/
2) Aprire il terminale nella cartella ed eseguire il comando  
    ```console
    (sudo) docker-compose up -d
    ```
3) Controllare che il progetto funzioni da Docker Desktop oppure eseguendo il comando 
    ```console
    docker ps -a
    ```
    Questo comando installerà mongo, parse server e parse dashboard all'indirizzo <http://localhost:4040/>.

4) Se la dashboard non va, aggiungere una entry nel file hosts (C:\Windows\System32\drivers\etc\hosts)
    ```
    127.0.0.1 parse
    ```

## TODO: Aggiungere la password! 
(Nel file FUNZIONANTE la password va, ma appena si prova a morificarla non funziona più :()







lib/Optiond/Definitions.js