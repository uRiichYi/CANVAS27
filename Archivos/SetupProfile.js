import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, SafeAreaView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function SetupProfile({ route }) {
    // Recibimos los datos del paso anterior
    const { email, password, tempName } = route.params || {};
    
    // Si el usuario puso un nombre temporal, lo usamos por defecto aquí
    const [fullName, setFullName] = useState(tempName || '');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState(null);

    const pickImage = async () => {
        // Pedimos permisos y abrimos la galería
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, // Permite recortar la foto
            aspect: [1, 1],      // Cuadrado perfecto para el avatar
            quality: 0.8,
        });

        if (!result.canceled) {
            setAvatar(result.assets[0].uri);
        }
    };

    const handleCompleteProfile = () => {
        // Aquí armaríamos el FormData para enviarlo al backend en Python
        const finalUserData = {
            email,
            password,
            fullName,
            bio,
            avatarUri: avatar
        };
        
        console.log("Datos listos para enviar a la base de datos:", finalUserData);
        alert("¡Perfil completado exitosamente!");
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>TU PERFIL</Text>

            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarPlaceholder}>+ Agregar Foto</Text>
                )}
            </TouchableOpacity>

            <View style={styles.form}>
                <TextInput 
                    style={styles.input} 
                    placeholder="Nombre Completo" 
                    placeholderTextColor="#888"
                    value={fullName}
                    onChangeText={setFullName}
                />
                <TextInput 
                    style={[styles.input, styles.textArea]} 
                    placeholder="Biografía (Háblanos de tu arte...)" 
                    placeholderTextColor="#888"
                    multiline
                    numberOfLines={4}
                    value={bio}
                    onChangeText={setBio}
                />

                <TouchableOpacity style={styles.button} onPress={handleCompleteProfile}>
                    <Text style={styles.buttonText}>FINALIZAR REGISTRO</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#272727', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: '700', color: '#F5F5F5', letterSpacing: 3, marginBottom: 30 },
    avatarContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#1d1d1d', justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 2, borderColor: '#D4AA7D', overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    avatarPlaceholder: { color: '#D4AA7D', fontSize: 12, textAlign: 'center' },
    form: { width: '80%', maxWidth: 400 },
    input: { backgroundColor: '#1d1d1d', color: '#F5F5F5', padding: 15, borderRadius: 8, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#D4AA7D' },
    textArea: { height: 100, textAlignVertical: 'top' },
    button: { backgroundColor: '#D4AA7D', padding: 15, borderRadius: 30, alignItems: 'center', marginTop: 10 },
    buttonText: { color: '#272727', fontWeight: 'bold', letterSpacing: 2 }
});