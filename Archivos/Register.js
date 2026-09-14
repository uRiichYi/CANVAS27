import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function Register({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [tempName, setTempName] = useState('');

    const handleNextStep = () => {
        // Validación básica antes de avanzar
        if (!email || !password) {
            alert("Por favor, ingresa correo y contraseña.");
            return;
        }
        
        // Navegamos a la configuración del perfil, pasando los datos
        navigation.navigate('SetupProfile', {
            email: email,
            password: password,
            tempName: tempName
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>CANVAS 27</Text>
            <Text style={styles.subtitle}>Únete como Artista</Text>

            <View style={styles.form}>
                <TextInput 
                    style={styles.input} 
                    placeholder="Nombre temporal (Opcional)" 
                    placeholderTextColor="#888"
                    value={tempName}
                    onChangeText={setTempName}
                />
                <TextInput 
                    style={styles.input} 
                    placeholder="Correo Electrónico" 
                    placeholderTextColor="#888"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput 
                    style={styles.input} 
                    placeholder="Contraseña" 
                    placeholderTextColor="#888"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity style={styles.button} onPress={handleNextStep}>
                    <Text style={styles.buttonText}>SIGUIENTE</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#272727', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 32, fontWeight: '900', color: '#F5F5F5', letterSpacing: 4, marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#D4AA7D', marginBottom: 40, textTransform: 'uppercase', letterSpacing: 2 },
    form: { width: '80%', maxWidth: 400 },
    input: { backgroundColor: '#1d1d1d', color: '#F5F5F5', padding: 15, borderRadius: 8, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#D4AA7D' },
    button: { backgroundColor: 'transparent', borderColor: '#D4AA7D', borderWidth: 1, padding: 15, borderRadius: 30, alignItems: 'center', marginTop: 10 },
    buttonText: { color: '#D4AA7D', fontWeight: 'bold', letterSpacing: 2 }
});