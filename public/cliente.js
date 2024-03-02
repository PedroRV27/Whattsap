document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    const salaSeleccionada = document.getElementById('sala').value;
    const contenedorLogin = document.getElementById('contenedor-login');
    const contenedorChat = document.getElementById('contenedor-chat');
    const formularioLogin = document.getElementById('formulario-login');
    const formularioMensaje = document.getElementById('formulario-mensaje');
    const entradaMensaje = document.getElementById('entrada-mensaje');
    const mensajesChat = document.getElementById('mensajes-chat');
    const listaUsuarios = document.getElementById('usuarios');
    const avatares = document.querySelectorAll('#contenedor-avatar img');
    const avatarUploadInput = document.getElementById('avatar-upload');
    let escribiendo = false;
    let timeout = undefined;
    let nombreUsuarioActual = '';

    formularioLogin.addEventListener('submit', (evento) => {
        evento.preventDefault();

        const nombreUsuario = document.getElementById('nombre-usuario').value.trim();
        const estado = document.getElementById('estado').value.trim();
        const avatarSeleccionado = document.querySelector('#contenedor-avatar img.selected');
        const salaSeleccionada = document.getElementById('sala').value; 

        if (nombreUsuario && estado && avatarSeleccionado && salaSeleccionada) {
            const avatar = avatarSeleccionado.getAttribute('src');
            const datosUsuario = { nombreUsuario, estado, avatar, sala: salaSeleccionada };
            socket.emit('login', datosUsuario);

            contenedorLogin.style.display = 'none';
            contenedorChat.style.display = 'flex';
            nombreUsuarioActual = nombreUsuario;


            const listaUsuarios = document.getElementById('usuarios');
            const itemUsuario = document.createElement('li');
            const imgAvatar = document.createElement('img');
            imgAvatar.src = avatar;
            imgAvatar.alt = 'Avatar de usuario';
            imgAvatar.classList.add('avatar-usuario');
            const nombreEstadoUsuario = document.createElement('span');
            nombreEstadoUsuario.textContent = `${nombreUsuario} (${estado})`;
            itemUsuario.appendChild(imgAvatar);
            itemUsuario.appendChild(nombreEstadoUsuario);
            listaUsuarios.appendChild(itemUsuario);
        } else {
            alert('Por favor, completa todos los campos y selecciona un avatar.');
        }
    });

    avatarUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            const imageData = e.target.result;
            const avatarPreview = document.createElement('img');
            avatarPreview.src = imageData;
            avatarPreview.alt = 'Avatar personalizado';
            avatarPreview.addEventListener('click', () => {
                avatares.forEach(a => a.classList.remove('selected'));
                avatarPreview.classList.add('selected');
            });
            document.getElementById('contenedor-avatar').appendChild(avatarPreview);
        };

        reader.readAsDataURL(file);
    });
        
    avatares.forEach(avatar => {
        avatar.addEventListener('click', () => {
            avatares.forEach(a => a.classList.remove('selected'));
            avatar.classList.add('selected');
        });
    });

    formularioMensaje.addEventListener('submit', (evento) => {
        evento.preventDefault();
        const mensaje = entradaMensaje.value.trim();
        if (mensaje !== '') {
            socket.emit('chatMessage', mensaje);
            entradaMensaje.value = '';
        }
    });

    entradaMensaje.addEventListener('keydown', () => {
        if (!escribiendo) {
            escribiendo = true;
            socket.emit('typing', true);
        }
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            escribiendo = false;
            socket.emit('typing', false);
        }, 2000); 
    });

    socket.on('chatMessage', (datos) => {
        const mensajeDiv = document.createElement('div');
        mensajeDiv.classList.add('mensaje');
        if (datos.user) {
            mensajeDiv.innerHTML = `<span class="remite">${datos.user.nombreUsuario}:</span> ${datos.message}`;
        } else {
            mensajeDiv.innerHTML = datos.message;
        }
        mensajesChat.appendChild(mensajeDiv);
    });

    socket.on('userTyping', (usuario) => {
        const estadoEscribiendo = document.getElementById('estado-escribiendo');
        estadoEscribiendo.textContent = `${usuario.nombreUsuario} está escribiendo...`;
        setTimeout(() => {
            estadoEscribiendo.textContent = '';
        }, 3000); 
    });

    socket.on('userConnected', (usuario) => {
        const itemUsuario = document.createElement('li');
        const usuarioContenedor = document.createElement('div'); 
        usuarioContenedor.classList.add('usuario-container');
        const avatarUsuario = document.createElement('img');
        avatarUsuario.src = usuario.avatar;
        avatarUsuario.alt = 'Avatar de usuario';
        avatarUsuario.classList.add('avatar-usuario');
        usuarioContenedor.appendChild(avatarUsuario); 
        const nombreEstadoUsuario = document.createElement('div');
        nombreEstadoUsuario.textContent = `${usuario.nombreUsuario} (${usuario.estado})`;
        usuarioContenedor.appendChild(nombreEstadoUsuario); 
        itemUsuario.appendChild(usuarioContenedor); 
        listaUsuarios.appendChild(itemUsuario);
    });

    socket.on('userDisconnected', (usuario) => {
        const listaUsuarios = document.querySelectorAll('#usuarios li');
        listaUsuarios.forEach((item) => {
            if (item.textContent.includes(usuario.nombreUsuario)) {
                item.remove();
            }
        });
    });

    socket.on('connectedUsers', (usuarios) => {
        const listaUsuarios = document.getElementById('usuarios');
        listaUsuarios.innerHTML = '';
        usuarios.forEach((usuario) => {
            const itemUsuario = document.createElement('li');
            itemUsuario.textContent = `${usuario.nombreUsuario} (${usuario.estado})`;
            listaUsuarios.appendChild(itemUsuario);
        });
    });


    socket.on('fileShared', (data) => {
        const mensajeDiv = document.createElement('div');
        mensajeDiv.classList.add('mensaje');

        if (data.type.startsWith('image')) {
            const imagen = new Image();
            imagen.src = data.data;
            imagen.classList.add('imagen-enviada');
            const remitenteSpan = document.createElement('span');
            remitenteSpan.textContent = data.user ? data.user.nombreUsuario : 'Anónimo';

            const enlaceDescargaImagen = document.createElement('a');
            enlaceDescargaImagen.href = data.data;
            enlaceDescargaImagen.download = data.name;
            enlaceDescargaImagen.textContent = `Descargar ${data.name}`;

            remitenteSpan.classList.add('remite');
            mensajeDiv.appendChild(remitenteSpan);
            mensajeDiv.appendChild(imagen);
        } else {
            const enlaceDescarga = document.createElement('a');
            enlaceDescarga.href = data.data;
            enlaceDescarga.download = data.name;
            enlaceDescarga.textContent = `Descargar ${data.name}`;
            mensajeDiv.appendChild(enlaceDescarga);
        }
        mensajesChat.appendChild(mensajeDiv);
    });

    listaUsuarios.addEventListener('click', (evento) => {
        if (evento.target.tagName === 'LI') {
            const nombreUsuarioPrivado = evento.target.textContent.split(' ')[0];
            mostrarVentanaConversacionPrivada(nombreUsuarioPrivado);
        }
    });

    formularioMensaje.addEventListener('submit', (evento) => {
        evento.preventDefault();
        const mensaje = entradaMensaje.value.trim();
        const archivo = document.getElementById('archivo').files[0]; 

        if (mensaje !== '' || archivo) {
            if (mensaje !== '') {
                socket.emit('chatMessage', mensaje);
                entradaMensaje.value = '';
            }
            if (archivo) {
                const reader = new FileReader();

                reader.onload = function (e) {
                    const data = e.target.result;
                    const tipo = archivo.type.split('/')[0];
                    if (tipo === 'image') {
                        const imagen = new Image();
                        imagen.src = data;
                        imagen.classList.add('imagen-enviada');

                        const remitenteSpan = document.createElement('span');
                        remitenteSpan.textContent = nombreUsuarioActual;
                        remitenteSpan.classList.add('remite');

                        const enlaceDescargaImagen = document.createElement('a');
                        enlaceDescargaImagen.href = data;
                        enlaceDescargaImagen.download = data.name;
                        enlaceDescargaImagen.textContent = `Descargar`;

                        const mensajeDiv = document.createElement('div');
                        mensajeDiv.classList.add('mensaje');
                        mensajeDiv.appendChild(remitenteSpan);
                        mensajeDiv.appendChild(imagen);
                        mensajesChat.appendChild(enlaceDescargaImagen);

                        mensajesChat.appendChild(mensajeDiv);
                    } else {
                        const enlaceDescarga = document.createElement('a');
                        enlaceDescarga.href = data;
                        enlaceDescarga.download = archivo.name;
                        enlaceDescarga.textContent = `Descargar ${archivo.name}`;

                        mensajesChat.appendChild(enlaceDescarga);
                    }
                    socket.emit('fileShared', { data: data, name: archivo.name, type: archivo.type });
                    document.getElementById('archivo').value = '';
                };

                reader.readAsDataURL(archivo);
            }
        }
    });
});