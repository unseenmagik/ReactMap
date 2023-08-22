import * as React from 'react'
import { Dialog, DialogContent, TextField } from '@mui/material'
import { useMutation } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import Query from '@services/Query'
import { useDialogStore, useStatic } from '@hooks/useStore'

import Header from '../general/Header'
import Footer from '../general/Footer'

export default function NestSubmission({ id, name }) {
  const open = useDialogStore((s) => s.nestSubmissions)
  const [newName, setNewName] = React.useState(name)
  const { t } = useTranslation()

  const [submitNestName, { error }] = useMutation(
    Query.nests('nestSubmission'),
    {
      refetchQueries: ['Nests'],
    },
  )

  const handleClose = () => useDialogStore.setState({ nestSubmissions: '0' })

  const handleSubmit = (e) => {
    if (e) e.preventDefault()

    submitNestName({
      variables: {
        id,
        name: newName,
      },
    })
    handleClose()
  }

  React.useEffect(() => {
    if (name !== newName && open === id) setNewName(name)
  }, [id, name])

  React.useEffect(() => {
    if (error) {
      useStatic.setState({
        webhookAlert: {
          open: true,
          severity: 'error',
          message:
            error.networkError?.statusCode === 401
              ? t('mutation_auth_error')
              : error.message,
        },
      })
    }
  }, [error])

  return (
    <Dialog open={open === id} onClose={handleClose}>
      <Header titles={['nest_submission_menu']} action={handleClose} />
      <DialogContent sx={{ mt: 2 }}>
        <form noValidate autoComplete="off" onSubmit={handleSubmit}>
          <TextField
            value={newName}
            onChange={({ target }) => setNewName(target.value)}
          />
        </form>
      </DialogContent>
      <Footer
        options={[
          {
            name: 'reset',
            action: () => setNewName(name),
          },
          {
            name: 'close',
            action: handleClose,
            color: 'error',
          },
          {
            name: 'save',
            action: handleSubmit,
            color: 'secondary',
          },
        ]}
        role="webhook_footer"
      />
    </Dialog>
  )
}
