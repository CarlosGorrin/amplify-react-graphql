import React, { useState, useEffect } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { Amplify, Auth } from 'aws-amplify';
import awsconfig from './aws-exports';
import { API, Storage } from 'aws-amplify';
import {
  Button,
  Flex,
  Heading,
  Image,
  Text,
  TextField,
  View,
  withAuthenticator,
} from '@aws-amplify/ui-react';
import { listNotes } from "./graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
} from "./graphql/mutations";

Amplify.configure(awsconfig);

const App = ({ signOut, selectedFile = null }) => {
  const [notes, setNotes] = useState([]);
  const [selectedFileName, setSelectedFileName] = useState("");

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(
      notesFromAPI.map(async (note) => {
        if (note.image) {
          const url = await Storage.get(note.name);
          note.image = url;
        }
        return note;
      })
    );
    setNotes(notesFromAPI);
  }

  async function createNote(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const image = form.get("image");
    const data = {
      name: form.get("name"),
      description: form.get("description"),
      image: selectedFile ? selectedFile.name : null,
    };
      if (selectedFile) {
        await Storage.put(data.name, selectedFile);
      }
    await API.graphql({
      query: createNoteMutation,
      variables: { input: data },
    });
    fetchNotes();
    event.target.reset();
  }

  async function deleteNote({ id, name }) {
    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    await Storage.remove(name);
    await API.graphql({
      query: deleteNoteMutation,
      variables: { input: { id } },
    });
  }

  const capitalizeFirst = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const hiddenFileInput = React.useRef(null);

  const handleClick = (event) => {
    hiddenFileInput.current.click();
  };

  const handleChange = (event) => {
    const fileUploaded = event.target.files[0];
    setSelectedFileName(fileUploaded.name);
  };

  return (
    <View className="App">
      <h1 className="text-6xl mb-5 text-sky-700 pt-6">My Notes App</h1>
      <View as="form" className="container mx-auto bg-gray-100 rounded-xl shadow border p-8 m-10" onSubmit={createNote}>
        <Flex direction="row" justifyContent="center">
          <TextField
            name="name"
            placeholder="Note Name"
            label="Note Name"
            labelHidden
            variation="quiet"
            required
          />
          <TextField
            name="description"
            placeholder="Note Description"
            label="Note Description"
            labelHidden
            variation="quiet"
            required
          />
          <Button onClick={handleClick}>
            Upload a file
          </Button>
          <View className="text-sm"
            name="image"
            as="input"
            type="file"
            ref={hiddenFileInput}
            onChange={handleChange}
            style={{ alignSelf: "end", display:'none' }}
          />
          {selectedFile && (
            <Text as="span" className="text-gray-500 text-sm mb-4">
              {selectedFile && <p>{selectedFile.name}</p>}
            </Text>
          )}
          <Button type="submit" variation="primary">
            Create Note
          </Button>
        </Flex>
      </View>
    <Heading level={2} className="text-2xl font-bold mb-4">Current Notes</Heading>
    <View margin="3rem 1rem" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {notes.map((note) => (
    <Flex
    key={note.id || note.name}
    direction="column"
    justifyContent="center"
    alignItems="center"
    className="bg-white p-4 rounded-md shadow-md"
    >
    {note.image && (
    <Image
    className="relative w-full h-0 overflow-hidden aspect-ratio-square mb-4"
    src={note.image}
    alt={`visual aid for ${notes.name}`}
    style={{ maxWidth: '350px', height: 'auto' }}
  />
    )}
    <Text as="strong" fontWeight={700} className="text-xl mb-2">
    {capitalizeFirst(note.name)}
    </Text>
    <Text as="span" className="text-gray-500 text-sm mb-4">{note.description}</Text>
    <Button
    variation="link"
    onClick={() => deleteNote(note)}
    className="text-red-500 hover:text-red-600 text-sm"
    >
    Delete note
    </Button>
    </Flex>
    ))}
    </View>
    <Button margin="3rem 0" onClick={signOut}>Sign Out</Button>
    </View>
  );
};

export default withAuthenticator(App);