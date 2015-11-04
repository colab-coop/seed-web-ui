Redis
========

Installs Redis.

Installation
--------------

`ansible-galaxy install palkan.redis`

Role Variables
--------------

`defaults/main.yml`

| Name                        | Default Value |  Description    |
|-----------------------------|---------------|-----------------|
| redis_version              | 3.0.2            | Redis version to install |
| redis_tmp_path             | "/usr/local/src/{{ ruby_name }}" | Where to download source | 
| redis_upstart_conf         | "upstart_redis.conf" | Path to upstart config (can be a template) |


Example Playbook
-------------------------
```yml
  - hosts: servers
    roles:
       - palkan.redis
```
